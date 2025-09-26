import { hasEnoughCredits, deductCredits } from '@/lib/credits_service';
import { getUserUuid } from '@/services/user';
import {
    createTaskRecord,
    markTaskAsFailed,
    markTaskAsFailedWithRefund,
    TaskType,
    ExternalProvider
} from '@/services/taskService';
import { NextRequest, NextResponse } from 'next/server';

// 可选：设置为edge运行时
// export const runtime = "edge";

export async function POST(request: NextRequest) {
    try {
        // return NextResponse.json({
        //     success: true,
        //     externalTaskId: "841e79f1919b66f1e6806ff8b99e69d8",
        //     internalTaskId: "ai_image_edit_741299555582021", // 返回任务ID供前端使用
        //     status: 'GENERATING',
        //     message: 'Image editing task created successfully'
        // }, { status: 200 });


        // 获取客户端IP
        const forwardedFor = request.headers.get("x-forwarded-for") ?? '';
        const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
        console.log(`request ip: ${clientIp}`);

        // 解析请求体 - 支持多图片编辑功能
        const requestData = await request.json();
        const { images, prompt, mode, aspectRatio, creditsRequired, turnstileToken } = requestData;

        // if (!turnstileToken || turnstileToken.length < 10) {
        //     console.error('Missing turnstileToken, or invalid length');
        //     // For development, you can comment out the return statement below
        //     // return NextResponse.json(
        //     //     { error: 'Missing turnstileToken or invalid length' },
        //     //     { status: 400 }
        //     // );
        // }

        // 验证 mode 参数
        if (!mode || !['image-to-image', 'text-to-image'].includes(mode)) {
            console.error('Invalid mode:', mode);
            return NextResponse.json(
                { error: 'Invalid mode. Supported modes: image-to-image, text-to-image' },
                { status: 400 }
            );
        }

        // 对于 image-to-image 模式，验证图片
        if (mode === 'image-to-image') {
            if (!images || !Array.isArray(images) || images.length === 0) {
                console.error('Missing images for image-to-image mode');
                return NextResponse.json(
                    { error: 'Missing images for image-to-image mode. Please provide an array of images.' },
                    { status: 400 }
                );
            }
        }

        // 验证提示词
        if (!prompt || prompt.trim().length === 0) {
            console.error('Missing or empty prompt');
            return NextResponse.json(
                { error: 'Missing or empty prompt' },
                { status: 400 }
            );
        }

        // 检查用户登录状态和积分
        // 使用项目现有的用户认证系统（支持NextAuth session和API key）
        const userId = await getUserUuid();

        if (!userId) {
            // 用户未登录
            console.log('User not logged in, skipping turnstile verification for development');

            // 返回需要登录的错误
            return NextResponse.json(
                { error: 'Login required. Please sign in to use AI image editing.', code: 'LOGIN_REQUIRED' },
                { status: 401 }
            );
        }

        console.log(`User ${userId} is logged in`);

        // 计算所需积分, 这里不用用户通过接口传过来的creditsRequired参数，而是直接计算
        const baseCredits = 10;
        const aspectRatioCredits = aspectRatio !== 'auto' ? 10 : 0;
        const totalCredits = baseCredits + aspectRatioCredits;

        console.log(`Calculating credits: base=${baseCredits}, aspectRatio=${aspectRatioCredits}, total=${totalCredits}`);

        // 检查用户积分是否足够
        const hasCredits = await hasEnoughCredits(userId, totalCredits);
        if (!hasCredits) {
            return NextResponse.json(
                { error: `Insufficient credits. You need at least ${totalCredits} credits for AI image editing.`, code: 'INSUFFICIENT_CREDITS' },
                { status: 402 }
            );
        }

        // 使用 Kie.ai 的 Nano Banana Image API 创建生成任务
        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) {
            console.error('Missing KIE_API_KEY in environment variables');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // 上传图片到ImgBB并获取URL数组（仅对image-to-image模式）
        let imageUrls: string[] = [];
        if (mode === 'image-to-image') {
            console.log(`Uploading ${images.length} images to ImgBB...`);
            imageUrls = await Promise.all(
                images.map(async (image: string, index: number) => {
                    const imageUrl = await uploadToImgBB(image);
                    console.log(`Image ${index + 1}/${images.length} uploaded to ImgBB: ${imageUrl}`);
                    return imageUrl;
                })
            );
            console.log(`All ${imageUrls.length} images uploaded successfully`);
        }

        // 构建API请求体 - 根据模式使用不同的模型和参数
        let apiRequestBody: any;

        if (mode === 'text-to-image') {
            // 文生图模式：使用google/nano-banana模型
            apiRequestBody = {
                model: 'google/nano-banana',
                input: {
                    prompt, // 使用用户提供的prompt
                },
                output_format: "png",
                image_size: aspectRatio
            };
            console.log('Text-to-image API request body:', JSON.stringify(apiRequestBody));
        } else {
            // 图生图模式：使用google/nano-banana-edit模型
            apiRequestBody = {
                model: 'google/nano-banana-edit',
                input: {
                    prompt, // 使用用户提供的prompt
                    image_urls: imageUrls // 使用ImgBB返回的URL数组
                },
                output_format: "png",
                image_size: aspectRatio
            };
            console.log('Image-to-image API request body:', JSON.stringify(apiRequestBody));
        }

        // 发送请求到 Kie.ai API
        const apiResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(apiRequestBody)
        });

        console.log(`Kie.ai API response status: ${apiResponse.status}`);

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Kie.ai API error:', JSON.stringify(errorData));
            return NextResponse.json(
                { error: 'Failed to create generation task', details: errorData },
                { status: apiResponse.status }
            );
        }

        // 获取任务ID和其他响应信息
        const taskResp = await apiResponse.json();
        if (taskResp.code != 200) {
            console.error('Kie.ai API response missing task id:', JSON.stringify(taskResp));
            return NextResponse.json(
                { error: `Failed to create ${mode} task`, details: taskResp },
                { status: 500 }
            );
        }
        const externalTaskId = taskResp.data.taskId;
        console.log(`${mode} task created with ID: ${externalTaskId}`);

        // 在kie.ai成功创建任务后，创建任务记录
        const taskId = await createTaskRecord(
            userId,
            mode === 'text-to-image' ? TaskType.AIImageGeneration : TaskType.AIImageEdit,
            totalCredits,
            {
                externalProvider: ExternalProvider.KieAI,
                externalTaskId: externalTaskId, // 使用kie.ai返回的taskId
            }
        );

        // 扣除用户积分
        const deducted = await deductCredits(userId, totalCredits, `AI ${mode} with Nano Banana (${totalCredits} credits)`);
        if (!deducted) {
            console.error(`Failed to deduct ${totalCredits} credits for user ${userId}`);
            await markTaskAsFailed(taskId, 'Failed to deduct credits');
            return NextResponse.json(
                { error: 'Failed to process payment. Please try again.' },
                { status: 500 }
            );
        }

        console.log(`Successfully deducted ${totalCredits} credits for user ${userId}, task ${taskId}`);

        return NextResponse.json({
            success: true,
            externalTaskId,
            internalTaskId: taskId, // 返回任务ID供前端使用
            status: 'GENERATING',
            message: `AI ${mode} task created successfully`
        }, { status: 200 });

    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to create image editing task'
        }, { status: 500 });
    }
}

// 上传图片到ImgBB并返回URL
async function uploadToImgBB(image: string): Promise<string> {
    const imgbbApiKey = process.env.IMGBB_API_KEY;
    if (!imgbbApiKey) {
        throw new Error('Missing IMGBB_API_KEY in environment variables');
    }

    // 如果图片是base64字符串，确保正确格式化
    let imageBase64 = image;
    if (image.includes(',')) {
        // 如果base64包含data URL前缀，则提取纯base64部分
        imageBase64 = image.split(',')[1];
    }

    try {
        // 使用标准的 application/x-www-form-urlencoded 方式上传
        // 这是ImgBB API推荐的方式，适用于服务器端环境
        const params = new URLSearchParams();
        params.append('key', imgbbApiKey);
        params.append('image', imageBase64);
        params.append('expiration', '300'); // 5分钟后过期

        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });

        console.log(`ImgBB API response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ImgBB API error response:', errorText);
            throw new Error(`ImgBB API error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('ImgBB API response:', JSON.stringify(data));

        if (!data.success) {
            console.error('ImgBB API returned success: false:', JSON.stringify(data));
            throw new Error(data.error?.message || 'ImgBB API returned success: false');
        }

        if (!data.data?.url) {
            console.error('ImgBB API response missing URL:', JSON.stringify(data));
            throw new Error('ImgBB API response missing image URL');
        }

        console.log(`Image uploaded to ImgBB successfully: ${data.data.url}`);
        return data.data.url;

    } catch (error) {
        console.error('Failed to upload image to ImgBB:', error);

        // 如果是网络错误，提供更详细的错误信息
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to ImgBB API');
        }

        // 重新抛出原始错误
        throw error;
    }
}

