import { SessionWithRuns } from "@/types/datamodel";
import RunItem from "./RunItem";

interface SessionGroupProps {
  title: string;
  sessions: SessionWithRuns[];
  onViewRun: (sessionId: number, runId: string) => Promise<void>;
  onDeleteSession: (sessionId: number) => Promise<void>;
}
const SessionGroup = ({ title, sessions, onViewRun, onDeleteSession }: SessionGroupProps) => (
  <div>
    <div className="px-2 py-1 text-xs font-semibold text-white/50 uppercase">{title}</div>
    <div className="space-y-4">
      {sessions.map((sessionWithRuns) => (
        <div key={sessionWithRuns.session.id} className="space-y-1">
          <div className="px-2 text-xs text-white/30">{sessionWithRuns.session.name || `Session ${sessionWithRuns.session.id}`}</div>
          {sessionWithRuns.runs.map((run) => (
            <RunItem key={run.id} sessionId={sessionWithRuns.session.id!} run={run} onClick={onViewRun} onDelete={onDeleteSession} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default SessionGroup;
