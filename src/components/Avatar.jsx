import { colorFor, initials } from '../utils.js';

export default function Avatar({ name, size = 44, group = false, photo }) {
  const box = { width: size, height: size, fontSize: size * 0.42 };
  if (photo && !group) {
    return <img className="avatar" src={photo} alt="" style={{ ...box, objectFit: 'cover' }} />;
  }
  return (
    <div className="avatar" style={{ ...box, background: group ? '#607d8b' : colorFor(name), color: '#fff' }}>
      {group ? '👥' : initials(name)}
    </div>
  );
}
