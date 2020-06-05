import * as React from 'react'
import { OnlineWebRTCClient, User } from 'utils/WebRTCClient'

function throttle<FN extends (...args: any[]) => void>(
  fn: FN,
  period: number,
): (...args: Parameters<FN>) => void {
  let blockUntil: number = Date.now()
  return (...args) => {
    if (Date.now() < blockUntil) return
    fn(...args)
    blockUntil = Date.now() + period
  }
}

const sendTypePeriod = 1 * 1000
const clearTypeTimeout = 2 * 1000

export function useMessages({
  broadcast,
  user,
  eventHub: {
    ports: { message: messageHub },
  },
}: OnlineWebRTCClient) {
  const typings = React.useRef<Record<User['id'], number>>({})
  const handleType = throttle(function handleType() {
    broadcast({ type: 'typing', content: '' })
  }, sendTypePeriod)

  const [messages, setMessages] = React.useState<
    { source: User; content: string }[]
  >([])

  function speak(content: string) {
    broadcast({ type: 'speak', content })
    onSpeak(user, content)
  }

  const onSpeak = (source: User, content: string) =>
    setMessages((messages) => [...messages, { source, content }])

  React.useEffect(() => {
    function onTyping(user: User) {
      clearTypingTimer(user)
      typings.current[user.id] = window.setTimeout(() => {
        onTypingEnd(user)
      }, clearTypeTimeout)
    }

    function onTypingEnd(user: User) {
      clearTypingTimer(user)
      Reflect.deleteProperty(typings.current, user.id)
    }

    function clearTypingTimer(user: User) {
      const timer = typings.current[user.id]
      if (timer) {
        window.clearTimeout(timer)
      }
    }

    return messageHub.addEventListener(function handleMessage(
      source,
      { type, content },
    ) {
      switch (type) {
        case 'speak':
          onSpeak(source, content)
          onTypingEnd(source)
          break
        case 'typing':
          onTyping(source)
          break
      }
    })
  }, [messageHub])

  return {
    typings: typings.current,
    handleType,
    messages,
    speak,
  }
}
