import { Textarea } from "@/components/ui/textarea";

interface SystemPromptSectionProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  disabled: boolean;
}

export const SystemPromptSection = ({ value, onChange, error, disabled }: SystemPromptSectionProps) => {
  return (
    <div>
      <label className="text-sm text-white/70 mb-2 block">Agent Instructions</label>
      <div className="space-y-4">
        <Textarea
          value={value}
          onChange={onChange}
          className={`bg-[#1A1A1A] border-[#3A3A3A] text-white min-h-[150px] font-mono ${error ? "border-red-500" : ""}`}
          placeholder="Enter the agent instructions. These instructions tells the agent how to behave and what to do."
          disabled={disabled}
        />

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    </div>
  );
};
