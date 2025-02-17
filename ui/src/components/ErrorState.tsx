interface ErrorStateProps {
    message: string;
  }
  
  export function ErrorState({ message }: ErrorStateProps) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
        <div className="text-red-500">{message}</div>
      </div>
    );
  }
  