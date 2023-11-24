import React, { useState, useEffect } from 'react'

interface CountdownTimerProps {
  initialTime: number
  onTimeout?: () => void
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  initialTime,
  onTimeout,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime)

  useEffect(() => {
    if (timeRemaining > 0) {
      const timerId = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1)
      }, 1000)

      return () => clearInterval(timerId)
    } else if (onTimeout) {
      onTimeout()
    }
  }, [timeRemaining, onTimeout])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    const formattedMinutes = String(minutes).padStart(2, '0')
    const formattedSeconds = String(remainingSeconds).padStart(2, '0')
    return `${formattedMinutes}:${formattedSeconds}`
  }

  return <>Time Remaining: {formatTime(timeRemaining)}</>
}

export default CountdownTimer
