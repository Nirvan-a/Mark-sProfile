import { useCallback, useEffect, useRef, useState } from 'react'
import playMusicIcon from '../../tools/askdata/assets/playmusic.svg'
import springFlowers from '../../tools/askdata/assets/Spring Flowers.mp3'
import concerto from '../../tools/askdata/assets/Concerto.mp3'
import sunsetLandscape from '../../tools/askdata/assets/Sunset Landscape.mp3'
import './MusicPlayer.css'

const MUSIC_TRACKS = [
  { name: 'Spring Flowers', src: springFlowers },
  { name: 'Concerto', src: concerto },
  { name: 'Sunset Landscape', src: sunsetLandscape },
]

export function MusicPlayer() {
  const [isMusicPlaying, setIsMusicPlaying] = useState(true)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isMusicMenuOpen, setIsMusicMenuOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isMusicPlayingRef = useRef(isMusicPlaying)
  const interactionHandlerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    isMusicPlayingRef.current = isMusicPlaying
  }, [isMusicPlaying])

  const attachInteractionListener = useCallback(() => {
    if (interactionHandlerRef.current) return
    const handler = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsMusicPlaying(true))
      }
      document.removeEventListener('pointerdown', handler)
      interactionHandlerRef.current = null
    }
    interactionHandlerRef.current = handler
    document.addEventListener('pointerdown', handler, { once: true })
  }, [])

  const tryPlayAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio
      .play()
      .then(() => setIsMusicPlaying(true))
      .catch(() => {
        setIsMusicPlaying(false)
        attachInteractionListener()
      })
  }, [attachInteractionListener])

  useEffect(() => {
    const audio = new Audio(MUSIC_TRACKS[currentTrackIndex].src)
    audio.loop = false
    audioRef.current = audio

    const handleEnded = () => {
      setCurrentTrackIndex((prev) => (prev + 1) % MUSIC_TRACKS.length)
    }

    audio.addEventListener('ended', handleEnded)

    if (isMusicPlayingRef.current) {
      tryPlayAudio()
    }

    return () => {
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentTrackIndex, tryPlayAudio])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isMusicPlaying) {
      tryPlayAudio()
    } else {
      audio.pause()
    }
  }, [isMusicPlaying, tryPlayAudio])

  useEffect(() => {
    return () => {
      if (interactionHandlerRef.current) {
        document.removeEventListener('pointerdown', interactionHandlerRef.current)
        interactionHandlerRef.current = null
      }
    }
  }, [])

  const toggleMusic = () => {
    setIsMusicPlaying((prev) => !prev)
  }

  const handleTrackSelect = (index: number) => {
    setCurrentTrackIndex(index)
    setIsMusicPlaying(true)
    setIsMusicMenuOpen(false)
  }

  const handleMusicEnter = () => setIsMusicMenuOpen(true)
  const handleMusicLeave = () => setIsMusicMenuOpen(false)

  return (
    <div className="music-floating">
      <div className="music-inline-label">Mark's little tool</div>
      <div
        className={`music-hover-wrapper${isMusicMenuOpen ? ' menu-open' : ''}`}
        onMouseEnter={handleMusicEnter}
        onMouseLeave={handleMusicLeave}
      >
        <div className="music-control">
          <div className="music-icon-wrapper">
            <button
              className={`music-icon${isMusicPlaying ? ' playing' : ''}`}
              onClick={toggleMusic}
              type="button"
              title={isMusicPlaying ? '暂停音乐' : '播放音乐'}
            >
              <img src={playMusicIcon} alt="音乐播放" />
            </button>
            <div className={`music-dropdown${isMusicMenuOpen ? ' visible' : ''}`}>
              {MUSIC_TRACKS.map((track, idx) => (
                <button
                  key={track.name}
                  type="button"
                  className={`music-track-btn${idx === currentTrackIndex ? ' active' : ''}`}
                  onClick={() => handleTrackSelect(idx)}
                >
                  {track.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

