const random = array => { return array[Math.floor(Math.random() * array.length)] }

const getGreetings = () => {
  const answers = [
    'Hello! Welcome to Mom Bot',
    'Hey, nice to see you. I - Mom Bot are willing to help you today',
    'Welcome to Mom Bot',
    'Hey, Welcome back! A healthy mom - A happy family.'
  ]
  return random(answers)
}

module.exports = getGreetings