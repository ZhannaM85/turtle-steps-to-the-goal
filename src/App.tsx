import { Button } from '@/shared/ui/button'

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold text-foreground">
        Turtle Steps to the Goal
      </h1>
      <Button>Log today</Button>
    </main>
  )
}

export default App
