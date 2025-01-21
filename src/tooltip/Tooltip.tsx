// components/Tooltip.tsx
import { ParentComponent, Show, createSignal } from "solid-js";

interface TooltipProps {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

const Tooltip: ParentComponent<TooltipProps> = (props) => {
  const [isVisible, setIsVisible] = createSignal(false);
  let timeoutId: number;

  const showTooltip = () => {
    timeoutId = setTimeout(() => setIsVisible(true), props.delay || 300);
  };

  const hideTooltip = () => {
    clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positionClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  }[props.position || "top"];

  return (
    <div 
      class="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {props.children}
      <Show when={isVisible()}>
        <div 
          class={`absolute z-50 px-2 py-1 text-sm text-white bg-gray-800 rounded whitespace-nowrap ${positionClass}`}
          role="tooltip"
        >
          {props.text}
          <div 
            class={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
              props.position === "bottom" ? "-top-1 left-1/2 -translate-x-1/2" :
              props.position === "top" ? "-bottom-1 left-1/2 -translate-x-1/2" :
              props.position === "left" ? "-right-1 top-1/2 -translate-y-1/2" :
              "-left-1 top-1/2 -translate-y-1/2"
            }`}
          />
        </div>
      </Show>
    </div>
  );
};

export default Tooltip;
