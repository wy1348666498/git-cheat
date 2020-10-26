// 引入必要的模块
const dayjs = require('dayjs') // 引入 dayjs 库用于处理日期时间
const axios = require('axios') // 引入 axios 库用于发送 HTTP 请求
const fs = require('fs') // 引入 fs 库用于文件操作
const path = require('node:path') // 引入 path 库处理文件路径
const simpleGit = require('simple-git') // 引入 simple-git 库用于 Git 操作
const ProgressBar = require('progress') // 引入 progress 库用于显示进度

// 生成随机时间（时、分、秒）
function getRandomTime() {
    // 生成随机小时（0-23）
    const hours = Math.floor(Math.random() * 24)
    // 生成随机分钟（0-59）
    const minutes = Math.floor(Math.random() * 60)
    // 生成随机秒钟（0-59）
    const seconds = Math.floor(Math.random() * 60)

    // 创建一个日期对象并设置随机时间，返回格式化后的时间字符串
    return dayjs('1970-01-01 00:00:00').hour(hours).minute(minutes).second(seconds).format('HH:mm:ss')
}

// 获取随机一言
async function getRandomSentence() {
    try {
        // 发送 HTTP GET 请求获取随机一言
        const res = await axios.get('https://api.vvhan.com/api/ian/rand?type=json')
        return Promise.resolve(res?.data?.data || {})
    } catch (e) {
        return Promise.resolve({})
    }
}

/**
 * @description 将文件提交到 Git
 * @param {string} filePath - 文件路径
 * @param {string} dateStr - 日期字符串
 */
async function commitFileToGit(filePath, dateStr) {
    try {
        const git = simpleGit()
        // 添加文件到 Git 暂存区
        await git.add(filePath)
        // 提交文件到 Git，使用指定的日期
        await git.commit(`feat: 提交${filePath.split('.')[1]}文件`, filePath, { '--date': dateStr })
        // 推送
        await git.push('origin', 'master')
    } catch (error) {
        console.error(`提交文件到 Git 时出错：${filePath}`, error.message)
    }
}

/**
 * @description 随机生成文件
 */
function generateFile(fPath, fileNameNoSuffix, content) {
    // 定义可能的文件后缀
    const extensions = ['ts', 'js', 'vue', 'html', 'tsx']
    // 随机选择一个文件后缀
    const randomExtension = extensions[Math.floor(Math.random() * extensions.length)]
    const fillPath = path.join(fPath, `${fileNameNoSuffix}.${randomExtension}`)
    let nContent = ''
    switch (randomExtension) {
        case 'html':
            nContent = `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>
    ${content}
</body>
</html>
`
            break
        case 'js':
            nContent = `export function generateDoc(){
    return '${content}'
}
`
            break
        case 'ts':
            nContent = `export function generateDoc():string{
    return '${content}'
}
`
            break
        case 'vue':
            nContent = `<template>
  <div>${content}</div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
`
            break
        case 'tsx':
            nContent = `const NotFound = () => {
  return <div>${content}</div>
}

export default NotFound
`
            break
        default:
            break
    }
    fs.writeFileSync(fillPath, nContent)
    return fillPath
}

/**
 * @description 根据起始时间生成文件并提交到 Git
 * @param {string} startDate - 起始日期（格式：YYYY-MM-DD）
 * @param {string} endDate - 结束日期（格式：YYYY-MM-DD）
 */
async function generateFileDocAndGit(startDate, endDate) {
    try {
        const start = dayjs(startDate)
        const end = dayjs(endDate)

        // 检查起始日期和结束日期的有效性
        if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
            return Promise.reject('起始日期或结束日期无效，或起始日期在结束日期之后')
        }

        let currentDate = start
        let totalDays = end.diff(start, 'day') + 1
        const bar = new ProgressBar(':bar (:current/:total)', { total: totalDays, clear: true })

        // 循环处理每一天的日期
        while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
            const year = currentDate.format('YYYY')
            const dateStr = currentDate.format('YYYY-MM-DD')
            const yearDir = path.join(__dirname, 'doc', year)

            try {
                // 创建年份目录，如果不存在则递归创建
                fs.mkdirSync(yearDir, { recursive: true })
            } catch (e) {}

            // 提交多次文件，每次生成一个随机时间
            let currentTime = dayjs(`${dateStr} ${getRandomTime()}`)
            let nums = 0
            const totalNum =Math.floor(Math.random()*5)+1
            while (currentTime.isSame(currentDate, 'day')&&nums<totalNum) {
                // 获取随机一言内容
                const doc = await getRandomSentence()
                // 将内容整合为一个数组，过滤空值
                const docList = [doc?.content, doc?.form, doc?.creator].filter((e) => e)
                const time = currentTime.format('YYYY-MM-DD HH:mm:ss')
                // 生成随机数
                const randomNum = Math.floor(Math.random() * 1000)
                const filePath = generateFile(yearDir, `${currentTime.format('YYYY-MM-DD')}_${randomNum}`, docList.join('--'))
                // 提交文件到 Git
                await commitFileToGit(filePath, time)
                // 生成下一个随机时间，间隔在 30 到 90 分钟之间
                const minutesToAdd = Math.floor(Math.random() * (90 - 30 + 1)) + 30
                currentTime = currentTime.add(minutesToAdd, 'minute')
                nums++
            }
            // 更新进度
            bar.tick(1)

            // 处理下一天的日期
            currentDate = currentDate.add(1, 'day')
        }
    } catch (error) {
        return Promise.reject(error)
    }
}

// generateFileDocAndGit('2020-10-27', '2024-07-04')

/**
 * 提交所有文件到 Git，并指定提交日期。
 * @param {string} commitMessage 提交信息
 * @param {string} commitDate ISO 8601 格式的日期字符串
 */
async function commitWithDate(commitMessage, commitDate) {
    const git = simpleGit()
    try {
        // 添加所有文件到暂存区
        await git.add('.')

        // 提交更改，带有指定日期
        await git.commit(commitMessage, {
            '--date': commitDate
        })

        console.log('所有文件已成功提交，提交日期为: ' + `${commitDate} ${getRandomTime()}`)
    } catch (err) {
        console.error('提交时发生错误: ', err)
    }
}
commitWithDate('feat: 项目初始化', '2020-10-26')
