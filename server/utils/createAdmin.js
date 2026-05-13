const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')
const User = require('../models/User')

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI missing in server/.env')
    }

    await mongoose.connect(process.env.MONGO_URI)

    const existing = await User.findOne({ email: 'admin@rhythmictunes.com' })
    if (existing) {
      // Reset to known working credentials for demo reliability.
      existing.name = existing.name || 'Admin'
      existing.username = existing.username || 'admin'
      existing.password = 'admin123'
      existing.isAdmin = true
      await existing.save()
      console.log('Admin reset: admin@rhythmictunes.com / admin123')
      return
    }

    await User.create({
      name: 'Admin',
      username: 'admin',
      email: 'admin@rhythmictunes.com',
      password: 'admin123',
      isAdmin: true,
    })

    console.log('Admin created: admin@rhythmictunes.com / admin123')
  } catch (error) {
    console.error('Failed to create admin:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

run()
