
function scrollToTask(idTask, forceParent=false){
  let extraScroll=-40
  let targetElement = `super-task-${idTask}`
  let altTargetElement = `task-card-${idTask}`
  let el=document.getElementById(targetElement)
  if (el==null || forceParent) {
    el=document.getElementById(altTargetElement)
    extraScroll=-60
  }
  let viewportOffset = el.getBoundingClientRect();
  window.scrollBy(0, viewportOffset.top, "smooth")
  el.scrollIntoView()
  window.scrollBy(0, extraScroll, "smooth")
}

function scrollToEpic(idEpic, forceParent=false){
  console.log(`scrollToEpic(${idEpic})`)
  let extraScroll=-40
  let targetElement = `epic-container-${idEpic}`
  let altTargetElement = `epic-card-${idEpic}`
  let el=document.getElementById(targetElement)
  if (el==null || forceParent) {
  el=document.getElementById(altTargetElement)
  extraScroll=-60
}
  let viewportOffset = el.getBoundingClientRect();
  window.scrollBy(0, viewportOffset.top, "smooth")
  el.scrollIntoView()
  window.scrollBy(0, extraScroll, "smooth")
}

  function restoreYScroll(scroll){
  window.scroll(0, scroll)
}
