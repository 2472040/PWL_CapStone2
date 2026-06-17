interface TimelineItem {
  id?: string | number;
  n?: number;
  short?: string;
  label?: string;
  action?: string;
  sub?: string;
}

export default function TimelineRail({
  items,
  activeIndex,
  onSelect,
}: {
  items: TimelineItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="relative w-full max-w-3xl mx-auto my-12">
      {/* Background Rail */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-[#27272a] -translate-y-1/2 rounded-full z-0" />

      {/* Active Rail */}
      <div
        className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#6366F1] to-[#D69DDE] -translate-y-1/2 rounded-full transition-all duration-500 ease-out z-0"
        style={{ width: `${(activeIndex / (items.length - 1)) * 100}%` }}
      />

      <div className="relative z-10 flex justify-between items-center w-full">
        {items.map((item, index) => {
          const isActive = index <= activeIndex;
          const key = item.id !== undefined ? item.id : item.n;
          const shortLabel = item.short !== undefined ? item.short : item.label;
          const actionLabel = item.action !== undefined ? item.action : item.sub;

          return (
            <div
              key={key}
              className="relative flex flex-col items-center group cursor-pointer"
              onClick={() => onSelect(index)}
            >
              {/* Top Label */}
              <div
                className={`absolute -top-10 text-xs font-medium whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`}
              >
                {shortLabel}
              </div>

              {/* Node */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-[#6366F1] shadow-[0_0_15px_rgba(99,102,241,0.6)] scale-110'
                    : 'bg-[#18181b] border-2 border-[#3f3f46] group-hover:border-[#6366F1]'
                }`}
              >
                {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              {/* Bottom Label (Optional, maybe role name) */}
              <div
                className={`absolute top-10 text-xs text-center w-32 -ml-16 left-1/2 transition-colors duration-300 ${isActive ? 'text-gray-300' : 'text-gray-600'}`}
              >
                {actionLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
