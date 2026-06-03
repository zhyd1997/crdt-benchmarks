import { AbstractCrdt, CrdtFactory } from '../../js-lib/index.js' // eslint-disable-line
import { EgWalkerReplica, OPERATION_TYPE } from '@softmaple/eg-walker'
import * as error from 'lib0/error'

export const name = 'softmaple/eg-walker'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/**
 * @param {any} event
 */
const serializeEvent = event => ({
  id: event.id,
  operation: event.operation,
  parentVersion: Array.from(event.parentVersion),
  timestamp: event.timestamp
})

/**
 * @param {any} event
 */
const deserializeEvent = event => ({
  id: event.id,
  operation: event.operation,
  parentVersion: new Set(event.parentVersion),
  timestamp: event.timestamp
})

/**
 * @param {any} value
 */
const encodeJson = value => textEncoder.encode(JSON.stringify(value))

/**
 * @param {Uint8Array|string} update
 */
const decodeJson = update => JSON.parse(typeof update === 'string' ? update : textDecoder.decode(update))

/**
 * @implements {CrdtFactory}
 */
export class EgWalkerFactory {
  constructor () {
    this.nextReplicaId = 0
  }

  createReplicaId () {
    return `eg-walker-${this.nextReplicaId++}`
  }

  /**
   * @param {function(Uint8Array):void} updateHandler
   */
  create (updateHandler) {
    return new EgWalkerCRDT(updateHandler, undefined, this.createReplicaId())
  }

  /**
   * @param {function(Uint8Array):void} updateHandler
   * @param {Uint8Array|string} bin
   * @return {AbstractCrdt}
   */
  load (updateHandler, bin) {
    return new EgWalkerCRDT(updateHandler, bin, this.createReplicaId())
  }

  getName () {
    return name
  }
}

/**
 * @implements {AbstractCrdt}
 */
export class EgWalkerCRDT {
  /**
   * @param {function(Uint8Array):void} updateHandler
   * @param {Uint8Array|string|undefined} init
   * @param {string} replicaId
   */
  constructor (updateHandler, init, replicaId) {
    this.updateHandler = updateHandler
    this.replica = init == null
      ? new EgWalkerReplica(replicaId)
      : EgWalkerReplica.deserialize(decodeJson(init), replicaId)
    this.knownEventIds = new Set(this.replica.exportEventGraph().map(event => event.id))
    this.transactionDepth = 0
    /**
     * @type {Array<Uint8Array>}
     */
    this.pendingUpdates = []
  }

  /**
   * @return {Uint8Array|string}
   */
  getEncodedState () {
    return encodeJson(this.replica.serialize())
  }

  /**
   * @param {Uint8Array|string} update
   */
  applyUpdate (update) {
    const event = deserializeEvent(decodeJson(update))
    this.replica.applyRemoteEvent(event)
    this.knownEventIds.add(event.id)
  }

  flushPendingUpdates () {
    const updates = this.pendingUpdates
    this.pendingUpdates = []
    updates.forEach(update => this.updateHandler(update))
  }

  /**
   * @param {Uint8Array} update
   */
  emitUpdate (update) {
    if (this.transactionDepth > 0) {
      this.pendingUpdates.push(update)
    } else {
      this.updateHandler(update)
    }
  }

  emitNewLocalEvents () {
    this.replica.exportEventGraph().forEach(event => {
      if (!this.knownEventIds.has(event.id)) {
        this.knownEventIds.add(event.id)
        this.emitUpdate(encodeJson(serializeEvent(event)))
      }
    })
  }

  /**
   * Insert several items into the internal shared array implementation.
   *
   * @param {number} index
   * @param {Array<any>} elems
   */
  insertArray (index, elems) { // eslint-disable-line
    error.methodUnimplemented()
  }

  /**
   * Delete several items into the internal shared array implementation.
   *
   * @param {number} index
   * @param {number} len
   */
  deleteArray (index, len) { // eslint-disable-line
    error.methodUnimplemented()
  }

  /**
   * @return {Array<any>}
   */
  getArray () {
    error.methodUnimplemented()
  }

  /**
   * Insert text into the internal shared text implementation.
   *
   * @param {number} index
   * @param {string} text
   */
  insertText (index, text) {
    this.replica.applyLocalOperation({
      type: OPERATION_TYPE.INSERT,
      index,
      text
    })
    this.emitNewLocalEvents()
  }

  /**
   * Delete text from the internal shared text implementation.
   *
   * @param {number} index
   * @param {number} len
   */
  deleteText (index, len) {
    this.replica.applyLocalOperation({
      type: OPERATION_TYPE.DELETE,
      index,
      length: len
    })
    this.emitNewLocalEvents()
  }

  /**
   * @return {string}
   */
  getText () {
    return this.replica.getText()
  }

  /**
   * @return {string}
   */
  toString () {
    return this.getText()
  }

  /**
   * @param {function (AbstractCrdt): void} f
   */
  transact (f) {
    this.transactionDepth++
    try {
      f(this)
    } finally {
      this.transactionDepth--
      if (this.transactionDepth === 0) {
        this.flushPendingUpdates()
      }
    }
  }

  /**
   * @param {string} key
   * @param {any} val
   */
  setMap (key, val) { // eslint-disable-line
    error.methodUnimplemented()
  }

  /**
   * @return {Map<string,any> | Object<string, any>}
   */
  getMap () {
    error.methodUnimplemented()
  }
}
