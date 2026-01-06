/**
 * 设备检测工具函数
 */

/**
 * 检测是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
export function isMobileDevice(): boolean {
  // 检测用户代理
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  
  // 移动设备的关键词
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
  
  // 检测屏幕宽度（通常移动设备宽度小于768px）
  const isSmallScreen = window.innerWidth < 768
  
  // 检测触摸支持
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  // 如果匹配移动设备关键词，或者（小屏幕且支持触摸），则认为是移动设备
  return mobileRegex.test(userAgent) || (isSmallScreen && hasTouchScreen)
}

