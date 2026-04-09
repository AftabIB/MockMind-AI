'use client';
import { useState, useEffect, useRef } from 'react';

export default function VisitorCounter() {
  const [count, setCount] = useState(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const alreadyVisited = sessionStorage.getItem('mm_visited');

    if (alreadyVisited) {
      fetch('/api/visitors')
        .then(res => res.json())
        .then(data => setCount(data.count))
        .catch(() => setCount(0));
    } else {
      fetch('/api/visitors', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          setCount(data.count);
          sessionStorage.setItem('mm_visited', 'true');
        })
        .catch(() => setCount(0));
    }
  }, []);

  if (count === null) return null;

  return (
    <span className="visitor-text">
      <span className="visitor-count-num">{count.toLocaleString()}</span> visitor{count !== 1 ? 's' : ''}
    </span>
  );
}
