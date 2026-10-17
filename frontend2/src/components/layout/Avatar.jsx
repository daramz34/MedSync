import { initials } from "../../utils/format";

export default function Avatar({ user, size = 36 }) {
  const style = { width: size, height: size };
  if (user?.profile_picture_url) {
    return (
      <img
        src={user.profile_picture_url}
        alt=""
        style={style}
        className="rounded-full object-cover ring-2 ring-white"
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.38 }}
      className="grid place-items-center rounded-full bg-primary font-semibold text-white ring-2 ring-white"
    >
      {initials(user?.full_name || user?.username)}
    </span>
  );
}