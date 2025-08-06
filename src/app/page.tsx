import ExamMonitor from '@/components/exam-monitor';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">
            Vigilant Exam
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            AI-powered exam proctoring to detect suspicious behavior.
          </p>
        </header>
        <main>
          <ExamMonitor />
        </main>
      </div>
    </div>
  );
}
