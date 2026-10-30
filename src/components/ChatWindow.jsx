import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { emitAsync, getSocket } from '../lib/socket';

export default function ChatWindow({ conversation, me }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimer = useRef(null);
  const bottomRef = useRef(null);

  const conversationId = String(conversation.id);

  // Join the room, load history, and listen for real-time events
  useEffect(() => {
    const socket = getSocket();
    let cancelled = false;

    const onNew = (msg) => {
      if (String(msg.conversation) !== conversationId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };

    const onTyping = (e) => {
      if (e.conversationId !== conversationId) return;
      if (String(e.user.id) === String(me.id)) return;
      setOtherTyping(e.isTyping);
    };

    const join = async () => {
      try {
        await emitAsync('conversation:join', { conversationId });
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };

    socket.on('message:new', onNew);
    socket.on('typing', onTyping);
    // After a reconnection the server forgets our rooms: join again
    socket.on('connect', join);

    (async () => {
      await join();
      try {
        const data = await api('/messages/list-by-conversation', {
          method: 'POST',
          body: { conversationId, limit: 100 },
        });
        if (cancelled) return;
        // Merge history with any message that arrived while loading
        setMessages((prev) => {
          const ids = new Set(data.messages.map((m) => m.id));
          return [...data.messages, ...prev.filter((m) => !ids.has(m.id))];
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();

    return () => {
      cancelled = true;
      socket.off('message:new', onNew);
      socket.off('typing', onTyping);
      socket.off('connect', join);
    };
  }, [conversationId, me.id]);

  // Always scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  const handleChange = (e) => {
    setText(e.target.value);

    const socket = getSocket();
    if (!typingTimer.current) socket.emit('typing:start', { conversationId });

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
      typingTimer.current = null;
    }, 1500);
  };

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;

    setText('');
    setError('');
    try {
      // The message comes back to us through the 'message:new' broadcast
      await emitAsync('message:send', { conversationId, body });
    } catch (err) {
      setError(err.message);
      setText(body);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {messages.map((m) => {
          const mine = String(m.sender?.id) === String(me.id);
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-md rounded-2xl px-4 py-2 ${
                  mine ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 shadow'
                }`}
              >
                {!mine && (
                  <p className="text-xs font-semibold text-slate-500">
                    {m.sender?.firstName} {m.sender?.firstLastName}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-right text-[10px] ${mine ? 'text-blue-200' : 'text-slate-400'}`}>
                  {new Date(m.sendAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        {otherTyping && <p className="text-sm italic text-slate-400">typing...</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={send} className="flex gap-2 border-t bg-white p-3">
        <input
          value={text}
          onChange={handleChange}
          maxLength={2000}
          placeholder="Write a message..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700">
          Send
        </button>
      </form>
    </div>
  );
}