import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cat face */}
          <circle cx="16" cy="18" r="12" fill="white" fillOpacity="0.95" />
          {/* Ears */}
          <path d="M6 8 L9 17 L3 15 Z" fill="white" fillOpacity="0.95" />
          <path d="M26 8 L23 17 L29 15 Z" fill="white" fillOpacity="0.95" />
          {/* Inner ears */}
          <path d="M7 10 L9 15 L5 14 Z" fill="#F472B6" fillOpacity="0.6" />
          <path d="M25 10 L23 15 L27 14 Z" fill="#F472B6" fillOpacity="0.6" />
          {/* Eyes */}
          <circle cx="11" cy="16" r="2.5" fill="#1e1b4b" />
          <circle cx="21" cy="16" r="2.5" fill="#1e1b4b" />
          {/* Eye shine */}
          <circle cx="10" cy="15" r="0.8" fill="white" />
          <circle cx="20" cy="15" r="0.8" fill="white" />
          {/* Nose */}
          <ellipse cx="16" cy="21" rx="2" ry="1.5" fill="#F472B6" />
          {/* Mouth */}
          <path d="M16 22.5 L14 25 M16 22.5 L18 25" stroke="#1e1b4b" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
