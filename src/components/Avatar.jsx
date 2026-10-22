import { colorFor, initials } from '../utils.js';

export default function Avatar({ name, size = 44, group = false }) {
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: group ? '#607d8b' : colorFor(name),
        color: '#fff',
      }}
    >
      {group ? '👥' : initials(name)}
    </div>
  );
}
