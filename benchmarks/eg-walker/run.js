import { EgWalkerFactory } from './factory.js'
import { runBenchmarks, writeBenchmarkResultsToFile } from '../../js-lib/index.js'

const isSupportedBenchmark = testName =>
  testName.startsWith('[B1.1]') ||
  testName.startsWith('[B1.2]') ||
  testName.startsWith('[B1.3]') ||
  testName.startsWith('[B1.4]') ||
  testName.startsWith('[B1.5]') ||
  testName.startsWith('[B1.6]') ||
  testName.startsWith('[B1.7]') ||
  testName.startsWith('[B2.') ||
  testName.startsWith('[B3.5]') ||
  testName.startsWith('[B4]')

;(async () => {
  await runBenchmarks(new EgWalkerFactory(), isSupportedBenchmark)
  writeBenchmarkResultsToFile('../results.json', _testName => true)
})()
