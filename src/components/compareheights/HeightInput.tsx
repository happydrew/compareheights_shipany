import React, { useState, useEffect, useRef } from 'react';
import { Unit } from './HeightCalculates';

interface HeightInputProps {
    value: number; // 以米为单位
    unit: Unit;
    onChange: (newValue: number) => void;
    className?: string;
}

// 辅助函数：米转英尺英寸
function metersToFeetInches(m: number): { feet: number; inches: number } {
    const totalInches = (m * 100) / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches - feet * 12;
    return { feet, inches };
}

// 辅助函数：英尺英寸转米
function feetInchesToMeters(feet: number, inches: number): number {
    const totalInches = feet * 12 + inches;
    return (totalInches * 2.54) / 100;
}

const HeightInput: React.FC<HeightInputProps> = ({ value, unit, onChange, className }) => {
    // 公制输入
    const [metricValue, setMetricValue] = useState(value.toString());
    // 英制输入
    const [feet, setFeet] = useState("");
    const [inches, setInches] = useState("");
    // 追踪是否有未提交的输入
    const blurTimeout = useRef<NodeJS.Timeout | null>(null);

    // 同步外部value到输入框
    useEffect(() => {
        if (unit === Unit.CM) {
            setMetricValue(value.toString());
        } else {
            const { feet, inches } = metersToFeetInches(value);
            setFeet(feet.toString());
            setInches(inches.toString());
        }
    }, [value, unit]);

    // 提交公制输入
    const handleMetricSubmit = () => {
        const num = parseFloat(metricValue);
        if (!isNaN(num) && num > 0) {
            onChange(num);
        } else {
            setMetricValue(value.toString()); // 恢复原值
        }
    };

    // 提交英制输入
    const handleImperialSubmit = () => {
        // feet和inches都必须为数字，且feet>=0, 0<=inches<12
        let f = parseInt(feet);
        let i = parseFloat(inches);
        if (isNaN(f) || f < 0) f = 0;
        if (isNaN(i) || i < 0) i = 0;
        if (i >= 12) {
            f += Math.floor(i / 12);
            i = i % 12;
        }
        const m = feetInchesToMeters(f, i);
        if (m > 0) {
            setFeet(f.toString())
            setInches(i.toString())
            onChange(m);
        } else {
            // 恢复原值
            const { feet: origFeet, inches: origInches } = metersToFeetInches(value);
            setFeet(origFeet.toString());
            setInches(origInches.toString());
        }
    };

    // 处理英制输入的回车和失焦
    const handleImperialBlur = () => {
        // 延迟，避免两个输入框切换时重复提交
        blurTimeout.current = setTimeout(() => {
            handleImperialSubmit();
        }, 100);
    };
    const handleImperialFocus = () => {
        if (blurTimeout.current) {
            clearTimeout(blurTimeout.current);
            blurTimeout.current = null;
        }
    };

    return (
        <div className={className}>
            <label htmlFor="character-height" className="block text-label-md text-gray-700 mb-1">Height</label>
            {unit === Unit.CM ? (
                <div className="flex gap-2">
                    <input
                        id="character-height"
                        type="number"
                        value={metricValue}
                        onChange={e => setMetricValue(e.target.value)}
                        onBlur={handleMetricSubmit}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleMetricSubmit();
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="any"
                        placeholder="Enter height in meters"
                    />
                    <span className="px-3 py-2 bg-gray-100 rounded-md text-sm">m</span>
                </div>
            ) : (
                <div className="flex flex-col items-start justify-center gap-1 md:gap-2">
                    <div id='ft-input' className='flex gap-2'>
                        <input
                            type="number"
                            value={feet}
                            onChange={e => setFeet(e.target.value)}
                            onBlur={handleImperialBlur}
                            onFocus={handleImperialFocus}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleImperialSubmit();
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            className="flex-1  px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="1"
                            placeholder="ft"
                        />
                        <span className="px-1 py-2 text-sm">ft</span>
                    </div>
                    <div id='in-input' className='flex gap-2'>
                        <input
                            type="number"
                            value={inches}
                            onChange={e => setInches(e.target.value)}
                            onBlur={handleImperialBlur}
                            onFocus={handleImperialFocus}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleImperialSubmit();
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="any"
                            placeholder="in"
                        />
                        <span className="px-1 py-2 text-sm">in</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeightInput;
