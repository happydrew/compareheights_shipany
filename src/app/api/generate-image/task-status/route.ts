import { NextRequest, NextResponse } from 'next/server';
import {
    markTaskAsSuccess,
    markTaskAsFailed,
    markTaskAsFailedWithRefund
} from '@/services/taskService';

export async function GET(request: NextRequest) {
    try {
        const forwardedFor = request.headers.get('x-forwarded-for');
        const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
        console.log(`request ip: ${clientIp}`);

        const url = new URL(request.url);
        const externalTaskId = url.searchParams.get('externalTaskId');
        const internalTaskId = url.searchParams.get('internalTaskId');

        // for testing purposes, simulate a delay in the response
        // const pollAttempts = url.searchParams.get('pollAttempts');
        // await new Promise(resolve => setTimeout(resolve, 1000));
        // if (pollAttempts == '8') {
        //     return NextResponse.json({
        //         success: true,
        //         status: 'SUCCESS',
        //         editedImage: 'https://tempfile.aiquickdraw.com/workers/nano/image_1758299179699_xjtmts.png',
        //         message: 'Image editing completed successfully'
        //     });
        // } else {
        //     return NextResponse.json({
        //         success: true,
        //         status: 'GENERATING',
        //         message: 'Image editing in progress, please check later'
        //     });
        // }


        if (!externalTaskId) {
            return NextResponse.json(
                { error: 'Missing taskId parameter' },
                { status: 400 }
            );
        }

        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) {
            console.error('Missing KIE_API_KEY in environment variables');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const apiResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${externalTaskId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json'
            }
        });

        console.log('Kie.ai API response status:', apiResponse.status);

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Kie.ai API error:', errorData);
            return NextResponse.json(
                { error: 'Failed to fetch task status', details: errorData },
                { status: apiResponse.status }
            );
        }

        const taskResp = await apiResponse.json();
        console.log('Kie.ai task response:', JSON.stringify(taskResp));

        if (taskResp.code !== 200) {
            console.error('Kie.ai API returned error code:', taskResp.code, taskResp.message);
            return NextResponse.json(
                { error: 'API returned error', details: taskResp.message },
                { status: 500 }
            );
        }

        const taskData = taskResp.data;
        if (!taskData) {
            console.error('Missing task data in response');
            return NextResponse.json(
                { error: 'Invalid response format' },
                { status: 500 }
            );
        }

        const rawState: string | null | undefined = taskData.state;
        console.log(`Task state: ${rawState}, taskId: ${taskData.taskId}`);

        if (rawState == 'success') {
            if (internalTaskId) {
                try {
                    await markTaskAsSuccess(internalTaskId);
                    console.log(`Task ${internalTaskId} marked as success`);
                } catch (recordError) {
                    console.error('Failed to update task status:', recordError);
                }
            }

            let imageUrl = null;
            try {
                if (taskData.resultJson) {
                    const resultData = typeof taskData.resultJson === 'string'
                        ? JSON.parse(taskData.resultJson)
                        : taskData.resultJson;
                    imageUrl = resultData?.resultUrls?.[0] || null;
                }
            } catch (parseError) {
                console.error('Failed to parse resultJson:', parseError);
            }

            return NextResponse.json({
                success: true,
                status: 'SUCCESS',
                editedImage: imageUrl,
                message: 'Image editing completed successfully'
            });
        } else if (rawState == 'fail') {
            if (internalTaskId) {
                try {
                    const errorMessage = taskData.failMsg || 'Image editing failed';
                    // 使用带退款功能的失败标记函数
                    await markTaskAsFailedWithRefund(internalTaskId, errorMessage);
                    console.log(`Task ${internalTaskId} marked as failed with refund: ${errorMessage}`);
                } catch (recordError) {
                    console.error('Failed to update task status or process refund:', recordError);
                }
            }

            return NextResponse.json({
                success: false,
                status: 'FAILED',
                error: taskData.failMsg || 'Image editing failed',
                failCode: taskData.failCode || '',
                message: 'Failed to edit image'
            });
        } else {
            return NextResponse.json({
                success: true,
                status: 'GENERATING',
                message: 'Image editing in progress, please check later'
            });
        }
    } catch (error: unknown) {
        console.error('API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to check image editing task status'
            },
            { status: 500 }
        );
    }
}
