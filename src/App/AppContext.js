import { createContext, useContext } from 'react'

const AppContext = createContext()
const useAppContext = () => useContext(AppContext)
const AppContextProvider = AppContext.Provider

export { AppContext, useAppContext, AppContextProvider }
