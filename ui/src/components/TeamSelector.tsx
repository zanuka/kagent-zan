import React, { useState } from "react";
import { Upload, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AssistantAgentConfig, Team, UserProxyAgentConfig } from "@/types/datamodel";
import { useUserStore } from "@/lib/userStore";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import KagentLogo from "@/components/kagent-logo";

const renderAgentItem = (agent: AssistantAgentConfig | UserProxyAgentConfig, type: string, index: number) => {
  return (
    <div key={index} className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {type === "assistant" ? <KagentLogo className="h-4 w-4" /> : <User className="h-4 w-4 text-blue-500" />}
        <span className="text-white/70">{agent.name}</span>
      </div>
      {type === "assistant" && (
        <Badge variant="outline" className="text-xs text-white/50">
          {(agent as AssistantAgentConfig).model_client.config.model}
        </Badge>
      )}
    </div>
  );
};
interface TeamSelectorProps {
  agentTeams: Team[];
  onTeamSelect: (team: Team | null, teamJson: string | null) => void;
}

const TeamSelector = ({ agentTeams, onTeamSelect }: TeamSelectorProps) => {
  const { userId } = useUserStore();
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [jsonContent, setJsonContent] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [importChoice, setImportChoice] = useState<"current" | "json" | "custom">("current");
  const [customUserId, setCustomUserId] = useState("");
  const [showUserIdAlert, setShowUserIdAlert] = useState(false);

  const handleJsonValidation = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      setParsedJson(parsed);

      // The JSON that's pasted in can either be in the format of an actual team 
      // that already includes the user_id, version and other fields. For example:
      // {
      //   "id": 0,
      //   "user_id": "someone",
      //   "version": "0.0.1",
      //   "component": {
      //     <TEAM JSON HERE>
      //    }
      //  }
      // OR it could be just the TEAM JSON. In that case, we'll just add the user_id


      if (parsed.user_id && parsed.user_id !== userId) {
        setShowUserIdAlert(true);
      } else {
        // Wrap the JSON in the team format
        const wrappedJson = {
          user_id: userId,
          version: "0.0.1",
          component: parsed,
        };

        handleFinalImport(wrappedJson);
      }
    } catch (error) {
      console.error("Invalid JSON content:", error);
    }
  };

  const handleJsonPaste = () => {
    handleJsonValidation(jsonContent);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFinalImport = (jsonData: any) => {
    const finalJson = { ...jsonData };

    switch (importChoice) {
      case "current":
        finalJson.user_id = userId;
        break;
      case "custom":
        finalJson.user_id = customUserId;
        break;
      case "json":
        // Keep the original user_id from JSON
        break;
    }

    onTeamSelect(null, finalJson);
    setIsJsonDialogOpen(false);
    setJsonContent("");
    setParsedJson(null);
    setShowUserIdAlert(false);
    setImportChoice("current");
    setCustomUserId("");
  };
  
  return (
    <div className="space-y-4">
      <Select
        onValueChange={(value) => {
          if (value === "import") {
            setIsJsonDialogOpen(true);
            return;
          }
          const team = agentTeams.find((t) => t.id === Number(value));
          if (team) {
            onTeamSelect(team, null);
          }
        }}
      >
        <SelectTrigger className="w-full border border-[#3A3A3A] text-sm text-white/70 bg-[#2A2A2A] hover:bg-[#3A3A3A] focus:ring-0 transition-colors h-12">
          <SelectValue placeholder="Select an AI agent team here" />
        </SelectTrigger>
        <SelectContent className="bg-[#2A2A2A] border-[#3A3A3A] border text-white text-sm">
          <ScrollArea className="h-[320px]">
            <SelectItem value="import" className="hover:bg-[#3A3A3A] focus:bg-[#3A3A3A] p-3 cursor-pointer">
              <div className="flex items-center text-white/70">
                <Upload className="w-4 h-4 mr-2" />
                Import Agent Team
              </div>
            </SelectItem>
            <Separator />
            {agentTeams.map((team) => (
              <SelectItem key={team.id} value={team.id?.toString() || "-1"} className="hover:bg-[#3A3A3A] focus:bg-[#3A3A3A] p-3 cursor-pointer data-[state=checked]:bg-[#3A3A3A]">
                <div className="space-y-2">
                  <div className="font-medium text-white">{team.component?.label || "No label available"}</div>
                  <p className="text-sm text-white/50 line-clamp-2 max-w-sm">{team.component?.description || "No description available"}</p>
                  <div className="space-y-1 pt-2 border-t border-[#3A3A3A]">
                    {team.component?.config.participants.map((participant, idx) =>
                      renderAgentItem(participant.config as AssistantAgentConfig | UserProxyAgentConfig, participant.provider.includes("AssistantAgent") ? "assistant" : "user", idx)
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
          </ScrollArea>
        </SelectContent>
      </Select>

      <Dialog open={isJsonDialogOpen} onOpenChange={setIsJsonDialogOpen}>
        <DialogContent className="bg-[#2A2A2A] border-[#3A3A3A] text-white">
          <DialogHeader>
            <DialogTitle>Import Agent Team JSON</DialogTitle>
          </DialogHeader>

          {!showUserIdAlert && (
            <>
              <Textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                placeholder="Paste your agent team JSON configuration here..."
                className="min-h-[200px] bg-[#1A1A1A] border-[#3A3A3A]"
              />
              <Button onClick={handleJsonPaste} className="w-full bg-[#3A3A3A] hover:bg-[#4A4A4A] text-white">
                Import
              </Button>
            </>
          )}

          {showUserIdAlert && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  The user ID in the JSON ({parsedJson?.user_id}) differs from your current user ID ({userId}). How would you like to proceed with the import?
                </AlertDescription>
              </Alert>

              <RadioGroup value={importChoice} onValueChange={(value: "current" | "json" | "custom") => setImportChoice(value)}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="current" id="current" />
                    <Label htmlFor="current">Use my current user ID ({userId})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="json" id="json" />
                    <Label htmlFor="json">Keep JSON user ID ({parsedJson?.user_id})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom">Use custom user ID</Label>
                  </div>
                </div>
              </RadioGroup>

              {importChoice === "custom" && (
                <Input type="text" placeholder="Enter custom user ID" value={customUserId} onChange={(e) => setCustomUserId(e.target.value)} className="bg-[#1A1A1A] border-[#3A3A3A]" />
              )}

              <div className="flex space-x-2">
                <Button onClick={() => handleFinalImport(parsedJson)} className="flex-1 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-white" disabled={importChoice === "custom" && !customUserId}>
                  Continue Import
                </Button>
                <Button
                  onClick={() => {
                    setShowUserIdAlert(false);
                    setParsedJson(null);
                  }}
                  variant="outline"
                  className="flex-1 border-[#3A3A3A] hover:bg-[#3A3A3A]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default TeamSelector;
