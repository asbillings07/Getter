import React, { useState, useRef, useEffect } from 'react';
import './Tooltip.css';

const Tooltip = ({ children, content, position = 'top', targetId }) => {
    const [visible, setVisible] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState({});
    const tooltipRef = useRef(null);
    const targetRef = useRef(null);

    useEffect(() => {
        const targetElement = document.querySelector(`[data-tooltip-id='${targetId}']`) || null;

        if (targetElement) {
            targetRef.current = targetElement;
            targetElement.addEventListener('mouseenter', () => setVisible(true));
            // targetElement.addEventListener('mouseleave', () => setVisible(false));
        }

        return () => {
            if (targetElement) {
                targetElement.removeEventListener('mouseenter', () => setVisible(true));
                // targetElement.removeEventListener('mouseleave', () => setVisible(false));
            }
        };
    }, [targetId]);

    useEffect(() => {
        if (visible && tooltipRef.current && targetRef.current) {
            const tooltipElement = tooltipRef.current;
            const targetElement = targetRef.current;
            console.log('targetElement', targetElement.dataset.tooltipContent, targetId)
            const { offsetHeight: tooltipHeight, offsetWidth: tooltipWidth } = tooltipElement;
            const { top, left, width, height } = targetElement.getBoundingClientRect();

            let newStyle = {};
            switch (position) {
                case 'top':
                    newStyle = {
                        left: left + width / 2 - tooltipWidth / 2,
                        top: top - tooltipHeight,
                    };
                    break;
                case 'bottom':
                    newStyle = {
                        left: left + width / 2 - tooltipWidth / 2,
                        top: top + height,
                    };
                    break;
                case 'left':
                    newStyle = {
                        left: left - tooltipWidth,
                        top: top + height / 2 - tooltipHeight / 2,
                    };
                    break;
                case 'right':
                    newStyle = {
                        left: left + width,
                        top: top + height / 2 - tooltipHeight / 2,
                    };
                    break;
                default:
                    newStyle = {
                        left: left + width / 2 - tooltipWidth / 2,
                        top: top - tooltipHeight,
                    };
                    break;
            }

            setTooltipStyle(newStyle);
        }
    }, [visible, position]);

    return visible && (
        <div className="tooltip" style={tooltipStyle} ref={tooltipRef}>
            {targetRef.current.dataset.tooltipContent}
        </div>
    );
};

export default Tooltip;
