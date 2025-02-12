import { MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  setShowTeamSelector: (show: boolean) => void;
}

const EmptyState = ({ setShowTeamSelector }: ActionButtonsProps) => (
  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
    <div className="bg-[#3A3A3A] rounded-full p-4 mb-4">
      <MessageSquare className="h-8 w-8 text-white/50" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">No chats yet</h3>
    <p className="text-sm text-white/50 max-w-[250px] mb-6">{"Start a new conversation to begin using kagent"}</p>
    <ActionButtons setShowTeamSelector={setShowTeamSelector} />
  </div>
);

const ActionButtons = ({ setShowTeamSelector }: ActionButtonsProps) => (
  <div className="space-y-3">
    <Button onClick={() => setShowTeamSelector(true)} variant="secondary" className="w-full  transition-colors gap-2">
      <Users className="h-4 w-4" />
      Switch Agent Team
    </Button>
  </div>
);
export { EmptyState, ActionButtons };
