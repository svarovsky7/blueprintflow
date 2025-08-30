export function debugTableScroll() {
  (function debugTableScrollIIFE() {
    const host = document.querySelector('.table-host') as HTMLElement | null
    if (!host) {
      console.warn('[scroll-debug] .table-host не найден')
      return
    }

    function dump(where: string) {
      const s = getComputedStyle(host!)
      console.group(`[scroll-debug] ${where}`)
      console.table({
        clientHeight: host!.clientHeight,
        scrollHeight: host!.scrollHeight,
        clientWidth: host!.clientWidth,
        scrollWidth: host!.scrollWidth,
        overflowY: s.overflowY,
        overflow: s.overflow,
        display: s.display,
        position: s.position,
        minHeight: s.minHeight,
        flex: s.flex,
        height: s.height,
      })
      console.groupEnd()
    }

    dump('init')
    requestAnimationFrame(() => dump('rAF'))
    window.addEventListener('resize', () => dump('resize'))
    window.addEventListener('ui:scale-changed', () => dump('scale'))

    host!.addEventListener(
      'wheel',
      (e) => {
        console.log('[scroll-debug] wheel on host', { deltaY: e.deltaY, target: e.target })
      },
      { passive: true }
    )

    window.addEventListener(
      'wheel',
      (e) => {
        if (!host!.contains(e.target as Node)) {
          console.log('[scroll-debug] wheel OUTSIDE host — кто-то забирает прокрутку выше', e.target)
        }
      },
      { passive: true }
    )

    ;(function traceAncestors(el: HTMLElement | null) {
      let i = 0
      while (el && i < 8) {
        const s = getComputedStyle(el)
        console.log(`[scroll-debug] ancestor #${i++}`, el.className || el.id || el.tagName, {
          overflowY: s.overflowY,
          overflow: s.overflow,
          position: s.position,
          display: s.display,
          minHeight: s.minHeight,
          height: s.height,
          transform: s.transform !== 'none' ? s.transform : undefined,
        })
        el = el.parentElement
      }
    })(host)
  })()
}
