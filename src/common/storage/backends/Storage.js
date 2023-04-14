import TaxonomyReference from "./TaxonomyReference"
import { assert, Result } from "./Utils"
import { filterMap } from "./Utils"
import { writable } from "svelte/store"

class Storage {
  constructor() {
    const chunks = window.location.href.split("/") // TODO:
    chunks.pop()
    chunks.pop()
    this.baseUrl = chunks.join("/") + "/artifacts/"
  }

  async listArtifacts() {
    const result = await this._fetchJson(this.baseUrl, null, ListError)
    const items = await result.unwrap()
    return filterMap(items, item => ArtifactSet.tryFrom(item))
  }

  async getDownloadUrl(parentId, ...ids) {
    // TODO: add item IDs
    const qs = `ids=${encodeURIComponent(JSON.stringify(ids))}`
    return this.baseUrl + parentId + `/download?${qs}`
  }

  _uploadFile({ method, url, headers }, file) {
    const { subscribe, set } = writable(0)
    const request = new XMLHttpRequest()
    request.upload.addEventListener(
      "progress",
      ev => {
        set(ev.loaded / ev.total)
      },
      false
    )
    const promise = new Promise(function(resolve, reject) {
      request.addEventListener(
        "load",
        () => {
          set(1)
          resolve(true)
        },
        false
      )
      request.addEventListener(
        "error",
        () => {
          const error = new AppendDataError(
            request.statusText || "Upload failed"
          )
          reject(error)
        },
        false
      )
      request.addEventListener("abort", () => resolve(false), false)
    })
    request.open(method, url)
    Object.entries(headers || {}).forEach(([name, value]) =>
      request.setRequestHeader(name, value)
    )
    request.send(file)
    return Object.assign(promise, {
      file,
      subscribe,
      abort() {
        request.abort()
      }
    })
  }

  async appendArtifact(artifactSet, metadata, files) {
    console.log({ action: "append", metadata, files })
    const url = this.baseUrl + artifactSet.id + "/append"
    const filenames = files.map(file => file.name)

    const opts = {
      method: "post",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        metadata,
        filenames
      })
    }

    const appendResult = await (
      await this._fetchJson(url, opts, AppendDataError)
    ).unwrap()

    return appendResult.files.map(({ name, params }) => {
      const targetFile = files.find(a => a.name == name)
      assert(
        !!targetFile,
        new AppendDataError("Could not find upload info for " + name)
      )
      return this._uploadFile(params, targetFile)
    })
  }

  async updateArtifact(metadata, newContent) {
    console.log("Updating artifact:", metadata, newContent)
  }

  async createArtifact(metadata, files) {
    console.log("Creating artifact:", metadata, files)
    metadata.taxonomyTags = metadata.taxonomyTags || []
    const opts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata
      })
    }
    return (await this._fetchJson(this.baseUrl, opts, CreateError)).unwrap()
  }

  async _fetch(url, opts = null, ErrorClass = RequestError) {
    const response = await fetch(url, opts)
    let error = null
    if (response.status === 422) {
      const data = await response.json()
      const context = new ModelContext(
        data.context.projectId,
        data.context.branch,
        data.context.nodeId
      )
      error = new ModelError(data.message, context)
    } else if (response.status > 399) {
      error = new ErrorClass(await response.text())
    }
    return new Result(response, error)
  }

  async _fetchJson(url, opts = null, ErrorClass = RequestError) {
    return (await this._fetch(url, opts, ErrorClass)).map(response =>
      response.json()
    )
  }
}

export class RequestError extends Error {
  constructor(msg) {
    super(msg)
  }
}

class ModelContext {
  constructor(projectId, branch, nodeId) {
    this.projectId = projectId
    this.nodeId = nodeId
    this.branch = branch
  }

  toQueryParams() {
    const params = new URLSearchParams({
      project: this.projectId,
      branch: this.branch,
      node: this.nodeId
    })
    return params.toString()
  }
}

export class ModelError extends Error {
  constructor(msg, context) {
    super(msg)
    this.context = context
  }
}

class StorageError extends RequestError {
  constructor(actionDisplayName, msg) {
    super(`Unable to ${actionDisplayName}: ${msg}`)
  }
}

class ListError extends StorageError {
  constructor(msg) {
    super("list artifacts", msg) // FIXME: rename "artifact"?
  }
}

class DownloadError extends StorageError {
  constructor(msg) {
    super("download", msg)
  }
}

class CreateError extends StorageError {
  constructor(msg) {
    super("create", msg)
  }
}

class AppendDataError extends StorageError {
  constructor(msg) {
    super("append", msg)
  }
}

class ArtifactSet {
  static tryFrom(item) {
    if (!item.displayName) {
      console.log("Found malformed data. Filtering out. Data:", item)
    } else {
      const hash = [
        item.id,
        ...item.children.map(child => child.id).sort()
      ].join("/")
      item.hash = hash
      item.children = item.children.map(child => {
        if (child.taxonomy) {
          child.taxonomy = TaxonomyReference.from(child.taxonomy)
        }
        return child
      })
      return item
    }
  }
}

export default Storage
