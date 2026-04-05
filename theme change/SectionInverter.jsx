import { useState, useRef, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const SectionInverter = ({
    isDarkSection = true,
    children,
    className = "",
    dotPositionClass = "top-5 left-5 sm:top-6 sm:left-6",
}) => {
    const [isInverted, setIsInverted] = useState(false);

    const [showClickHint, setShowClickHint] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("section-inverter-clicked") !== "true";
        }
        return true;
    });

    const sectionRef = useRef(null);

    useEffect(() => {
        const refreshTimeout = setTimeout(() => {
            if (ScrollTrigger) ScrollTrigger.refresh();
        }, 850);

        return () => clearTimeout(refreshTimeout);
    }, [isInverted]);

    const handleInvertClick = useCallback(
        async (e) => {
            const buttonRect = e.currentTarget.getBoundingClientRect();
            const bx = buttonRect.left + buttonRect.width / 2;
            const by = buttonRect.top + buttonRect.height / 2;

            const sectionRect = sectionRef.current.getBoundingClientRect();
            const maxRadius = Math.max(
                Math.hypot(bx - sectionRect.left, by - sectionRect.top),
                Math.hypot(bx - (sectionRect.left + sectionRect.width), by - sectionRect.top),
                Math.hypot(bx - sectionRect.left, by - (sectionRect.top + sectionRect.height)),
                Math.hypot(bx - (sectionRect.left + sectionRect.width), by - (sectionRect.top + sectionRect.height)),
            );

            if (showClickHint) {
                setShowClickHint(false);
                if (typeof window !== "undefined") {
                    localStorage.setItem("section-inverter-clicked", "true");
                }
            }

            const nextValue = !isInverted;
            window.dispatchEvent(
                new CustomEvent("section-inverter-toggle", {
                    detail: { isInverted: nextValue },
                })
            );

            if (!document.startViewTransition) {
                setIsInverted(nextValue);
                return;
            }

            const transition = document.startViewTransition(() => {
                flushSync(() => {
                    setIsInverted(nextValue);
                });
            });

            await transition.ready;

            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0px at ${bx}px ${by}px)`,
                        `circle(${maxRadius}px at ${bx}px ${by}px)`,
                    ],
                },
                {
                    duration: 1000,
                    easing: "ease-in-out",
                    pseudoElement: "::view-transition-new(root)",
                }
            );

            document.documentElement.animate(
                { opacity: [1, 1] },
                {
                    duration: 1000,
                    easing: "linear",
                    pseudoElement: "::view-transition-old(root)",
                }
            );
        },
        [isInverted, showClickHint]
    );

    const getDotColor = () => {
        if (isDarkSection) {
            return isInverted ? "bg-black" : "bg-[#e5e5e0]";
        }
        return isInverted ? "bg-[#e5e5e0]" : "bg-black";
    };

    const getTextColor = () => {
        if (isDarkSection) {
            return isInverted ? "text-black" : "text-[#e5e5e0]";
        }
        return isInverted ? "text-[#e5e5e0]" : "text-black";
    };

    return (
        <div ref={sectionRef} className={`relative ${className}`}>
            <button
                onClick={handleInvertClick}
                className={`absolute ${dotPositionClass} z-50 
                            w-5 h-5 sm:w-5 sm:h-5 min-w-0 min-h-0
                            rounded-full transition-all duration-300 
                            sm:hover:scale-125 
                            focus:outline-none 
                            shadow-md sm:shadow-lg 
                            ${getDotColor()}`}
            />

            {/* Curved Hint */}
            {showClickHint && (
                <div
                    className={`absolute ${dotPositionClass} z-[49] pointer-events-none`}
                    style={{
                        width: 0,
                        height: 0,
                        transform: "translate(50%, 50%)",
                    }}
                >
                    {/* Click */}
                    {"Click".split("").map((char, i) => {
                        const startAngle = 220;
                        const angleStep = 20;
                        const angle = startAngle + i * angleStep;
                        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                        const radius = isMobile ? 18 : 25;

                        return (
                            <span
                                key={`click-${i}`}
                                className={`absolute text-[0.6rem] sm:text-[0.65rem] font-bold leading-none ${getTextColor()}`}
                                style={{
                                    transform: `rotate(${angle}deg) translateY(${radius}px) rotate(180deg)`,
                                    left: "-0.1em",
                                    top: "-0.1em",
                                }}
                            >
                                {char}
                            </span>
                        );
                    })}

                    {/* me! */}
                    {"me!".split("").map((char, i) => {
                        const startAngle = 160;
                        const angleStep = 20;
                        const angle = startAngle + i * angleStep;
                        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                        const radius = isMobile ? 22 : 30;

                        return (
                            <span
                                key={`me-${i}`}
                                className={`absolute text-[0.6rem] sm:text-[0.65rem] font-bold leading-none ${getTextColor()}`}
                                style={{
                                    transform: `rotate(${angle}deg) translateY(-${radius}px)`,
                                    left: "-0.3em",
                                    top: "-0.4em",
                                }}
                            >
                                {char}
                            </span>
                        );
                    })}
                </div>
            )}

            <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                    backgroundColor: isDarkSection ? "#e5e5e0" : "#000000",
                    opacity: isInverted ? 1 : 0,
                }}
            />

            <div className="relative z-[2] w-full h-full">
                <div
                    className={`w-full h-full ${isInverted ? "color-inverted-content" : ""
                        }`}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};

export default SectionInverter;
