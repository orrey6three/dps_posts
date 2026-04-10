"use client";

type User = {
  id: string;
  username: string;
  role: string;
  post_count: number;
  created_at: string;
};

type Props = {
  users: User[];
  onDelete: (id: string) => Promise<void>;
};

export function AdminUsers({ users, onDelete }: Props) {
  return (
    <section className="card">
      <h3>Пользователи</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Роль</th>
            <th>Метки</th>
            <th>Дата</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.role}</td>
              <td>{user.post_count}</td>
              <td>{new Date(user.created_at).toLocaleDateString("ru-RU")}</td>
              <td>
                {user.role !== "admin" && (
                  <button className="button button-danger" onClick={() => onDelete(user.id)}>
                    Удалить
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
