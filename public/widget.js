/**
 * Bill-IO 견적요청 임베드 위젯
 * 사용법: <script src="https://your-domain.com/widget.js" data-token="YOUR_TOKEN"></script>
 * 옵션 data 속성:
 *   data-token   (필수) 공개 문의 폼 토큰
 *   data-color   버튼 배경색 (기본: #18181b)
 *   data-text    버튼 텍스트 (기본: "견적 요청")
 *   data-position  left | right (기본: right)
 */
;(function () {
  var script = document.currentScript
  if (!script) return

  var token = script.getAttribute("data-token")
  if (!token) { console.warn("[Bill-IO Widget] data-token is required"); return }

  var color = script.getAttribute("data-color") || "#18181b"
  var text = script.getAttribute("data-text") || "\uacac\uc801 \uc694\uccad"
  var position = script.getAttribute("data-position") === "left" ? "left" : "right"
  var origin = script.src.replace(/\/widget\.js.*$/, "")
  var iframeUrl = origin + "/r/" + encodeURIComponent(token) + "?embed=1"

  var isOpen = false
  var container = document.createElement("div")
  container.id = "billio-widget-root"
  container.style.cssText = "position:fixed;bottom:24px;z-index:2147483647;" + position + ":24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;"

  // Floating button
  var btn = document.createElement("button")
  btn.textContent = text
  btn.style.cssText = "all:unset;cursor:pointer;display:flex;align-items:center;gap:6px;padding:12px 20px;border-radius:50px;background:" + color + ";color:#fff;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s;"
  btn.onmouseenter = function () { btn.style.transform = "scale(1.05)"; btn.style.boxShadow = "0 6px 28px rgba(0,0,0,.3)" }
  btn.onmouseleave = function () { btn.style.transform = "scale(1)"; btn.style.boxShadow = "0 4px 20px rgba(0,0,0,.25)" }

  // Chat icon SVG
  var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  icon.setAttribute("width", "18")
  icon.setAttribute("height", "18")
  icon.setAttribute("viewBox", "0 0 24 24")
  icon.setAttribute("fill", "none")
  icon.setAttribute("stroke", "currentColor")
  icon.setAttribute("stroke-width", "2")
  icon.setAttribute("stroke-linecap", "round")
  icon.setAttribute("stroke-linejoin", "round")
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute("d", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z")
  icon.appendChild(path)
  btn.insertBefore(icon, btn.firstChild)

  // Popup panel
  var panel = document.createElement("div")
  panel.style.cssText = "display:none;position:absolute;bottom:60px;" + position + ":0;width:400px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 120px);border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 48px rgba(0,0,0,.2);border:1px solid #e5e5e5;transition:opacity .2s,transform .2s;"

  // Close button
  var close = document.createElement("button")
  close.innerHTML = "&times;"
  close.style.cssText = "all:unset;cursor:pointer;position:absolute;top:8px;right:12px;z-index:10;font-size:22px;color:#666;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,.9);"
  close.onclick = function () { toggle() }

  var iframe = document.createElement("iframe")
  iframe.src = iframeUrl
  iframe.style.cssText = "width:100%;height:100%;border:none;"
  iframe.setAttribute("loading", "lazy")

  panel.appendChild(close)
  panel.appendChild(iframe)
  container.appendChild(panel)
  container.appendChild(btn)

  function toggle() {
    isOpen = !isOpen
    if (isOpen) {
      panel.style.display = "block"
      setTimeout(function () { panel.style.opacity = "1"; panel.style.transform = "translateY(0)" }, 10)
    } else {
      panel.style.opacity = "0"
      panel.style.transform = "translateY(10px)"
      setTimeout(function () { panel.style.display = "none" }, 200)
    }
  }

  btn.onclick = function () { toggle() }

  // Listen for resize messages from iframe
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "billio-widget-resize" && typeof e.data.height === "number") {
      var h = Math.min(e.data.height + 20, window.innerHeight - 120)
      panel.style.height = h + "px"
    }
    if (e.data && e.data.type === "billio-widget-submitted") {
      setTimeout(function () { toggle() }, 3000)
    }
  })

  // Mobile: full width
  var mq = window.matchMedia("(max-width: 480px)")
  function handleMobile(e) {
    if (e.matches) {
      panel.style.width = "calc(100vw - 16px)"
      panel.style.left = "8px"
      panel.style.right = "8px"
      panel.style.bottom = "64px"
    } else {
      panel.style.width = "400px"
      panel.style.left = ""
      panel.style.right = ""
      panel.style[position] = "0"
      panel.style.bottom = "60px"
    }
  }
  mq.addEventListener("change", handleMobile)
  handleMobile(mq)

  document.body.appendChild(container)
})()
