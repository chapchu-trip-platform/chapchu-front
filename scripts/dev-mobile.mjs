import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import { resolve } from 'node:path'

const lanAddresses = Object.values(networkInterfaces())
  .flatMap((network) => network ?? [])
  .filter(
    (address) =>
      !address.internal &&
      (address.family === 'IPv4' || address.family === 4)
  )
  .map((address) => address.address)

if (lanAddresses.length === 0) {
  console.error('모바일 접속에 사용할 LAN IPv4 주소를 찾지 못했습니다.')
  process.exit(1)
}

const uniqueLanAddresses = [...new Set(lanAddresses)]
const forwardedArguments = process.argv.slice(2)
const portIndex = forwardedArguments.findIndex((argument) => argument === '--port')
const port = portIndex >= 0 ? forwardedArguments[portIndex + 1] : '3000'

console.log('모바일 접속 주소:')
uniqueLanAddresses.forEach((address) => {
  console.log(`  http://${address}:${port}`)
})

const nextBin = resolve('node_modules/next/dist/bin/next')
const child = spawn(
  process.execPath,
  [nextBin, 'dev', '--hostname', '0.0.0.0', ...forwardedArguments],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_ALLOWED_DEV_ORIGINS: uniqueLanAddresses.join(','),
    },
  }
)

process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))

child.on('error', (error) => {
  console.error('개발 서버를 시작하지 못했습니다.', error)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
