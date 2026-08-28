export default function TaskBlock({ title, topics, checks }) {
  return (
    <div className="py-6 border-b border-notion-border last:border-b-0">
      <h3 className="text-lg font-bold text-notion-text mb-3">{title}</h3>
      
      {/* Topics */}
      <ul className="list-disc list-inside space-y-1 mb-4 text-[15px] text-notion-muted">
        {topics.map((topic, idx) => (
          <li key={idx} className="pl-1 leading-relaxed">
            {topic}
          </li>
        ))}
      </ul>

      {/* Checks */}
      <div className="space-y-2">
        {checks.map((check, idx) => (
          <label key={idx} className="flex items-start gap-3 text-[15px] text-notion-muted cursor-pointer hover:text-notion-text transition-colors group">
            <input 
              type="checkbox" 
              className="mt-[3px]"
            />
            <span className="leading-relaxed select-none">{check}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
