import { useEffect, useRef } from "react";

interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [onClose]);

  const menuWidth = 160;
  const menuHeight = items.length * 40 + 8;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={ref}
      className="fixed bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
      style={{ left: Math.max(8, adjustedX), top: Math.max(8, adjustedY) }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.action(); onClose(); }}
          className={`w-full text-left px-4 py-2.5 text-sm active:bg-gray-200 hover:bg-gray-100 ${item.danger ? "text-red-600" : "text-gray-700"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
