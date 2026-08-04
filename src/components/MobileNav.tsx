import { BarChart3, Home, Settings2, Swords } from 'lucide-react'

export function MobileNav({ onHome, onCompare }: { onHome: () => void; onCompare: () => void }) {
  return <nav className="v03-mobile-nav" aria-label="모바일 주요 메뉴">
    <button onClick={onHome}><Home size={18} /><span>홈</span></button>
    <button className="active"><BarChart3 size={18} /><span>분석결과</span></button>
    <button onClick={onCompare}><Swords size={18} /><span>비교</span></button>
    <button><Settings2 size={18} /><span>설정</span></button>
  </nav>
}
