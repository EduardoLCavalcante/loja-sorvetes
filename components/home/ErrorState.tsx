import { Button } from "@/components/ui/button"

type ErrorStateProps = {
  message: string
  onRetry: () => void
}

const ErrorState = ({ message, onRetry }: ErrorStateProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50 flex items-center justify-center px-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow p-6 max-w-md text-center">
        <p className="text-red-600 font-semibold mb-2">Erro</p>
        <p className="text-gray-700 mb-4">{message}</p>
        <Button onClick={onRetry} className="bg-pink-600 text-white">
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}

export default ErrorState
