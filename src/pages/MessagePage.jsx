import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '../lib/api';
import { emitAsync, getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';

const upsert = (list, conv) =>
  list.some((c) => c.id === conv.id)
    ? list.map((c) => (c.id === conv.id ? conv : c))
    : [conv, ...list];

export default function MessagesPage() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState('');

  const fail = useCallback(
    (err) => (err.status === 401 ? logout() : setError(err.message)),
    [logout]
  );

  // 1. Initial load (Guest: own conversations | Staff: queue + own)
  useEffect(() => {
    api('/conversations/mine')
      .then((data) => setConversations(data.conversations))
      .catch(fail);
  }, [fail]);

  // 2. Real-time updates of the conversation list
  useEffect(() => {
    const socket = getSocket();

    const onCreated = (conv) => setConversations((prev) => upsert(prev, conv));

    const onUpdated = (conv) =>
      setConversations((prev) => {
        // A staff member that did not take it removes it from their queue
        const takenByOther =
          user.role === 'Staff' && conv.staff && String(conv.staff.id) !== String(user.id);
        return takenByOther ? prev.filter((c) => c.id !== conv.id) : upsert(prev, conv);
      });

    socket.on('conversation:created', onCreated);
    socket.on('conversation:updated', onUpdated);
    return () => {
      socket.off('conversation:created', onCreated);
      socket.off('conversation:updated', onUpdated);
    };
  }, [user]);

  // 3. Keep the session alive. The socket outlives the 10-minute JWT, so every
  //    4 minutes a REST call rotates the token and we hand it to the socket.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        await api('/conversations/mine');
        await emitAsync('auth:refresh', { token: getToken() });
      } catch (err) {
        fail(err);
      }
    }, 4 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fail]);

  const createConversation = async () => {
    setError('');
    try {
      const data = await api('/conversations/open', { method: 'POST' });
      setConversations((prev) => upsert(prev, data.conversation));
      setActiveId(data.conversation.id);
    } catch (err) {
      fail(err);
    }
  };

  const claimConversation = async (id) => {
    setError('');
    try {
      const data = await api('/conversations/claim', {
        method: 'POST',
        body: { conversationId: String(id) },
      });
      setConversations((prev) => upsert(prev, data.conversation));
      setActiveId(id);
    } catch (err) {
      fail(err);
    }
  };

  const active = conversations.find((c) => c.id === activeId);
  const canCreate = !conversations.some((c) => c.status?.name !== 'Closed');

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-800 px-6 py-3 text-white">
        <h1 className="font-semibold">Hotel Support Chat</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-full bg-slate-600 px-3 py-1">{user.role}</span>
          <button onClick={logout} className="hover:underline">Log out</button>
        </div>
      </header>

      {error && <p className="bg-red-50 px-6 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r bg-white">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            role={user.role}
            canCreate={canCreate}
            onSelect={setActiveId}
            onClaim={claimConversation}
            onCreate={createConversation}
          />
        </aside>

        <main className="flex-1">
          {active ? (
            <ChatWindow key={active.id} conversation={active} me={user} />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              {user.role === 'Guest'
                ? 'Open or select a conversation.'
                : 'Take a conversation from the queue to start answering.'}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}