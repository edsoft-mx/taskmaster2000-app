// import { useSessionStore } from 'stores/user_session';
import {reactive} from "vue";
//const store = useSessionStore()

function dummy(){
    console.log('need a breakpoint?')
}

function loginCallback(data){
  console.log('here')
  console.log(data)
}

let configuration

function store_configuration(config){
  configuration = config
}

async function callApiLogin(user, password){
    let formData = new FormData();
    formData.append('username', user)
    formData.append('password', password)
    let data = new URLSearchParams(formData)
    const url = configuration.apiURL
    const response = await fetch(`${url}/login`,
        {
            method: "POST",
            credentials: 'include',
            body: data,
            // headers: {"X-CSRFToken": "{ { csrf_token() } }"}
        })
    if (response.status !== 200) {
      location.reload()
      return false
    }
    if (window.electronAPI){
      let payload = await response.json()
      //store.setCurrentUser(user, payload.jwt)
      window.electronAPI.saveConfiguration({
        token: payload.jwt
      })
      return true
    }
    return true
}

async function callApi(method, endpoint, data){
    const url = configuration.apiURL
  //store.getAPIUrl
    let response
    if (window.electronAPI){
      let token= await window.electronAPI.getCookie('session_token')
      response = await fetch(`${url}/${endpoint}`,
          {
              method: method,
              mode: 'cors',
              body: JSON.stringify(data),
              credentials: 'include',
              headers: {
                  // {"X-CSRFToken": "{ { csrf_token() } }",
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
              }
          })
    }
    else{
      response = await fetch(`${url}/${endpoint}`,
        {
          method: method,
          credentials: 'include',
          body: JSON.stringify(data),
          headers: {
            // {"X-CSRFToken": "{ { csrf_token() } }",
            "Content-Type": "application/json",
          }
        })
    }
    if (response.status !== 200) {
      return null
    }
    return await response.json();
}

async function callLogout(){
  const url = configuration.apiURL
    //store.getAPIUrl
  const response = await fetch(`${url}/logout`, {
    method: "GET",
    credentials: 'include',
    headers: {
      // {"X-CSRFToken": "{ { csrf_token() } }",
      "Content-Type": "application/json"
    }
  })
  if (response.status === 200) {
      location.reload()
  }
}

export class Timeline {
  constructor(events, canvasHeight, includeBreaks, onlyBilled, forceEndOfDay=false, canvasWidth=0){
    this.workDayData = {
      length: 0,
      first: 0,
      last: 0,
      canvasHeight: canvasHeight,
      canvasWidth: canvasWidth,
      horizontal: canvasWidth > 0,
      conversion: 0,
      conversionX: 0,
      weeklyData: new Map(),
      intervals: [],
      dayNameMap: new Map(),
      //dayNameReverseMap: new Map(),
      daysToShow: [],
      workingHours: [],
      projects: {},
      projectTotals: {},
      todayKey: events.today_key,
    }
    this.chartData = {
      datasets: [],
      labels: [],
    }
    this.tentativePeriod = null
    this.pomodoroData = null

    this.events = events
    let first = events.start_of_day
    let last = events.end_of_day
    if (first===0){
      console.log('No data about start/end of day')
      first = new Date()
      last = new Date()
      last.setHours(first.getHours() + 2)
      let fmd = new Date()
      fmd.setHours(0,0,0,0,0)
      // console.log(fmd)
      // console.log(first)
      // console.log(last)
      first = (first - fmd) / 1000
      last = (last - fmd) / 1000
    }
    this.forceEndOfDay = forceEndOfDay
    if (forceEndOfDay){
      last = 3600 * 23
    }
    let firstHour
    let lastHour
    let workingHours = []
    if (canvasWidth === 0){ //vertical
      firstHour = Math.trunc(first / 3600) * 3600
      lastHour = (Math.trunc(last / 3600) + 1) * 3600
      for(let i = firstHour; i <= lastHour; i+=1800){
        let te = {epoch: i, time: this.getTimeOfDay(i)}
        //console.log(te)
        workingHours.push(te)
      }
    }
    else{
      firstHour = first
      lastHour = last
    }

    let allDayLength = lastHour - firstHour
    this.workDayData.projects= events.projects
    this.workDayData.projectTotals= events.total_per_project
    let projectIndex= new Map()
    for (let prj in this.workDayData.projects){
      if (!includeBreaks && prj==='Break'){
        continue;
      }
      if (onlyBilled && !this.workDayData.projects[prj].billing && prj!=='Break'){
        continue;
      }
      let projectData = {
        backgroundColor: this.workDayData.projects[prj].color,
        label: prj,
        data: [],
      }
      projectIndex.set(prj, this.chartData.datasets.length)
      this.chartData.datasets.push(projectData)
    }

    this.workDayData.length= allDayLength
    this.workDayData.first= firstHour
    this.workDayData.last= lastHour
    //this.workDayData.cw= canvasHeight
    this.workDayData.canvasHeight= canvasHeight
    this.workDayData.canvasWidth= canvasWidth
    this.workDayData.conversion= canvasHeight / allDayLength
    this.workDayData.conversionX= canvasWidth / allDayLength
    //workDayData.weeklyData= weeklyData
    this.workDayData.daysToShow= []
    this.workDayData.workingHours= workingHours
    this.workDayData.dayNameMap.clear()
    this.includeBreaks = includeBreaks
    this.onlyBilled = onlyBilled
    let minDay=1000
    let maxDay=0
    let anyDayFound = false
    for (let day in events.week_intervals) {
      anyDayFound = true
      if (day < minDay){
        minDay=day
      }
      if (day > maxDay){
        maxDay=day
      }
      let intervals = events.week_intervals[day]
      let keyParts = this.parseIntervalKey(intervals.date_key)
      let dayTitle= `${keyParts.dow}, ${keyParts.month} ${keyParts.day}`
      this.chartData.labels.push(dayTitle)
      this.workDayData.daysToShow.push(day)
      this.workDayData.dayNameMap.set(day, dayTitle)
      this.workDayData.weeklyData.set(day, intervals)
      let projectsDaily = new Map()
      for (let prj in this.workDayData.projects){
        projectsDaily.set(prj, 0)
      }
      for (let i=0; i<intervals.intervals_with_idle.length; i++){
        let prj = intervals.intervals_with_idle[i].project
        if (!includeBreaks && prj==='Break'){
          continue;
        }
        if (onlyBilled && !this.workDayData.projects[prj].billing && prj!=='Break'){
          continue;
        }
        let elapsed = Math.round(Number((intervals.intervals_with_idle[i].elapsed) / 60)*100)/100
        let current = projectsDaily.get(prj)
        current+= elapsed
        projectsDaily.set(prj, current)
      }
      for (let prj in this.workDayData.projects){
        if (!includeBreaks && prj==='Break'){
          continue;
        }
        if (onlyBilled && !this.workDayData.projects[prj].billing && prj!=='Break'){
          continue;
        }
        let current = projectsDaily.get(prj)
        let index= projectIndex.get(prj)
        this.chartData.datasets[index].data.push(current)
      }
    }
    if (minDay === maxDay){
      this.workDayData.intervals = this.workDayData.weeklyData.get(minDay).intervals
    }
    if (!anyDayFound){
      console.log(`no timespent data found for day ${this.workDayData.todayKey}`)
      let today= new Date()
      this.workDayData.dayNameMap.clear()
      this.workDayData.dayNameMap.set(this.workDayData.todayKey, today.toDateString())
      this.workDayData.daysToShow.push(this.workDayData.todayKey)
      //this.workDayData.intervals = []
      this.workDayData.weeklyData.set(this.workDayData.todayKey, {intervals_with_idle: [], intervals: []})
    }
  }

  workDayIntervals(dow){
    //dummy()
    if (!this.workDayData || !this.workDayData.weeklyData){
      return []
    }
    let dowData = this.workDayData.weeklyData.get(`${dow}`)
    if (!dowData){
      return []
    }
    if (this.includeBreaks){
      return dowData.intervals_with_idle
    }
    else {
      return dowData.intervals
    }
  }

  workDayMeetings(dow){
    //dummy()
    if (!this.workDayData || !this.workDayData.weeklyData){
      return []
    }
    let dowData = this.workDayData.weeklyData.get(`${dow}`)
    if (!dowData){
      return []
    }
    let m = dowData?.meetings
    if (m==null){
      return []
    }
    // console.log(`Meetings for ${dow}`)
    // console.log(m)
    return m
  }

  getIntervalXi(interval, extra=0){
    if (interval.collisions === 0){
      return 0
    }
    let p = 100 / interval.collisions
    return `${p * interval.column + extra }%`
  }

  getIntervalWidthColumn(interval){
    if (interval.collisions === 0){
      return "100%"
    }
    let p = 100 / interval.collisions
    return `${p}%`
  }

  getIntervalY(interval) {
    let y = (interval.start - this.workDayData.first) * this.workDayData.conversion
    // console.log(`${interval.task}.interval.x(${interval.start}) = ${x}`)
    return y
  }

  getIntervalX(interval) {
    let x = (interval.start - this.workDayData.first) * this.workDayData.conversionX
    //console.log(interval)
    //console.log(`${interval.task}.interval.x(${interval.start}) = ${x}`)
    return x
  }

  getIntervalHeight(interval) {
    let h = interval.elapsed ? interval.elapsed * this.workDayData.conversion : 0
    // console.log(`${interval.task}.interval.w(${interval.elapsed}) = ${w}`)
    if (h < 0){
      h = 0
    }
    return h
  }

  getIntervalWidth(interval) {
    let w = interval.elapsed ? interval.elapsed * this.workDayData.conversionX : 0
    //console.log(`${interval.task}.interval.w(${interval.elapsed}) = ${w}`)
    if (w < 0){
      w = 0
    }
    return w
  }

  isLongEnough4Text(interval){
    if (!interval){
      return false
    }
    // console.log(interval)
    let h = this.getIntervalHeight(interval)
    return h && h>16
  }

  tickYPosition(tick){
    let y = (tick.epoch - this.workDayData.first) * this.workDayData.conversion
    // console.log(`${interval.task}.interval.x(${interval.start}) = ${x}`)
    return y
  }

  getTimeOfDay(epoch){
    let hours = Math.trunc(epoch / 3600)
    let minutes = Math.trunc((epoch - (hours*3600)) / 60)
    return `${hours}`.padStart(2, '0') +':'+ `${minutes}`.padStart(2, '0')
  }

  parseIntervalKey(key){
    let mainParts= key.split("-")
    let dateParts= mainParts[0].split("/")
    let dow="?"
    switch(mainParts[1]){
      case "0":
        dow="Sunday"
        break
      case "1":
        dow="Monday"
        break
      case "2":
        dow="Tuesday"
        break
      case "3":
        dow="Wednesday"
        break
      case "4":
        dow="Thursday"
        break
      case "5":
        dow="Friday"
        break
      case "6":
        dow="Saturday"
        break
    }
    let month='?'
    switch(Number(dateParts[0])){
      case 1:
        month='Jan'
        break;
      case 2:
        month='Feb'
        break;
      case 3:
        month='Mar'
        break;
      case 4:
        month='Apr'
        break;
      case 5:
        month='May'
        break;
      case 6:
        month='Jun'
        break;
      case 7:
        month='Jul'
        break;
      case 8:
        month='Aug'
        break;
      case 9:
        month='Sept'
        break;
      case 10:
        month='Oct'
        break;
      case 11:
        month='Nov'
        break;
      case 12:
        month='Dec'
        break;
    }
    return {dow, month: month, day: dateParts[1]}
  }

  convertJSTsToChart(epoch){
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    let pomodoro2chartts = Math.trunc((epoch-today) / 1000) //- 21600
    console.log(`converted ts to pomodoro periods: ${pomodoro2chartts}`)
    return pomodoro2chartts
  }

  updateTentativePeriod(){
    if (this.tentativePeriod !=null){
      this.tentativePeriod.elapsed= (Date.now() - this.pomodoroData.start) / 1000
    }
  }

  startTentativePeriod(pomodoroData, forceEnd=false){
    let epochType = typeof pomodoroData.epoch;
    let epoch = 0
    console.log('startTentativePeriod')
    console.log(pomodoroData)
    if (epochType!=='number' && pomodoroData.epoch != null){
      let color = "#c0c0c0"
      if (pomodoroData.timerActive){
        console.log(`Tentative period end epoch @ ${pomodoroData.epoch}`)
        epoch = this.convertJSTsToChart(pomodoroData.epoch)
        if (!this.forceEndOfDay || forceEnd) {
          let first = this.events.start_of_day
          let last = this.events.end_of_day
          if (epoch > last){
            last = epoch
          }
          let allDayLength = last - first
          this.workDayData.length = allDayLength
          this.workDayData.conversion = this.workDayData.canvasHeight / allDayLength
          this.workDayData.conversionX = this.workDayData.canvasWidth / allDayLength
          this.workDayData.first = first
          this.workDayData.last = last
        }
        if (pomodoroData.task){
          color = pomodoroData.task.color //  prj.color
        }
        else {
          console.log('Pomodoro data has no task set')
        }
        console.log('Tentative period has been set')
        let tstart = this.convertJSTsToChart(pomodoroData.start)
        console.log(`tstart: ${tstart}`)
        let currentInterval = {
          color: color,
          tentative: true,
          start: tstart,
          end: tstart,
          elapsed: 0,
          task: pomodoroData.task?.title,
          taskKey: pomodoroData.task?.key,
          collisions: 0,
          counter: -1,
          column: 0,
        }
        console.log('Tentative period has been set:')
        console.log(currentInterval)
        this.tentativePeriod = currentInterval
        this.pomodoroData = pomodoroData
      }
      else {
        console.log("pomodoro.timer is not active")
      }
    }
    else {
      console.log("no epoch data")
    }
  }

  // getTentativePeriod(pomodoroData){
  //   let result = {
  //     active: false,
  //     interval: {}
  //   }
  //   let epochType = typeof pomodoroData.epoch;
  //   let epoch = 0
  //   if (epochType!=='number' && pomodoroData.epoch != null && this.tentativePeriod >= 0){
  //     if (pomodoroData.timerActive){
  //       result.interval = this.tentativePeriod;
  //         //this.workDayIntervals(this.workDayData.todayKey)[this.tentativePeriod]
  //       result.active = true
  //     }
  //   }
  //   return result
  // }

  // restoreTentativePeriod(pomodoroData, interval){
  //   let epochType = typeof pomodoroData.epoch;
  //   let epoch = 0
  //   if (epochType!=='number' && pomodoroData.epoch != null){
  //     if (!this.forceEndOfDay){
  //       epoch =  this.convertJSTsToChart(pomodoroData.epoch.getTime())
  //       let first = this.events.start_of_day
  //       let last = this.events.end_of_day
  //       let allDayLength = epoch < last  ? last - first : epoch - first
  //       this.workDayData.length= allDayLength
  //       this.workDayData.conversion= this.workDayData.canvasHeight / allDayLength
  //       this.workDayData.conversionX= this.workDayData.canvasWidth / allDayLength
  //     }
  //     this.tentativePeriod = this.workDayIntervals(this.workDayData.todayKey).length
  //     this.workDayIntervals(this.workDayData.todayKey).push(interval)
  //     this.pomodoroData = pomodoroData
  //   }
  // }

  currentTime(){
    let epoch = Date.now()
    let ftotd = new Date()
    ftotd.setHours(0,0,0,0 )
    epoch = (epoch - ftotd) / 1000
    let y = (epoch - this.workDayData.first) * this.workDayData.conversion
    //console.log(`Current time: ${y}, first time of the day: ${this.workDayData.first}, now: ${epoch}`)
    return y
  }

}

export {callApiLogin, callApi, callLogout, dummy, store_configuration}

