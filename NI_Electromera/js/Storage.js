class Storage {
	async save(key, data) {
		localStorage.setItem(key, JSON.stringify(data))
		return { success: true }
	}

	async load(key) {
		const rawData = localStorage.getItem(key)
		if (!rawData) {
			return null
		}
		try {
			return JSON.parse(rawData)
		} catch {
			console.error('Parse error')
			return []
		}
	}

	async deleteItem(key) {
		localStorage.removeItem(key)
		return { success: true }
	}
}

export default new Storage()
