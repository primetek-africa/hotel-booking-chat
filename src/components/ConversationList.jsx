const fullName = (u) => (u ? `${u.firstName} ${u.firstLastName}` : null);

export default function ConversationList({
  conversations, activeId, role, canCreate, onSelect, onClaim, onCreate,
}) {
  const isGuest = role === 'Guest';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold text-slate-700">
          {isGuest ? 'My conversations' : 'Support queue'}
        </h2>
        {isGuest && (
          <button
            onClick={onCreate}
            disabled={!canCreate}
            title={canCreate ? '' : 'You already have an active conversation'}
            className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          >
            + New
          </button>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <li className="p-4 text-sm text-slate-400">
            {isGuest ? 'Open a conversation to get help.' : 'No conversations yet.'}
          </li>
        )}

        {conversations.map((c) => {
          const waiting = !c.staff;
          const counterpart = isGuest ? fullName(c.staff) : fullName(c.guest);

          return (
            <li
              key={c.id}
              onClick={() => (!waiting || isGuest) && onSelect(c.id)}
              className={`border-b p-4 ${
                c.id === activeId ? 'bg-blue-50' : 'hover:bg-slate-50'
              } ${!waiting || isGuest ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">#{c.id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    c.status?.name === 'Open'
                      ? 'bg-amber-100 text-amber-700'
                      : c.status?.name === 'Assigned'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {c.status?.name}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {isGuest
                  ? waiting ? 'Waiting for a staff member...' : `Staff: ${counterpart}`
                  : `Guest: ${counterpart}`}
              </p>

              {!isGuest && waiting && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClaim(c.id); }}
                  className="mt-2 rounded-lg bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                >
                  Take conversation
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}