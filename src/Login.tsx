// import { IconUser } from '@tabler/icons-react'
// import loginImage from './assets/img/pomofocus_login_img.png'
// import { useEffect } from 'react'

const Login = () => {

  return (
    <div data-name="Login - Online" className="flex overflow-hidden py-0 pr-127 pl-0 w-360 h-256 bg-white">
      <div data-name="pomofocus 2 1" className="w-233 h-[1459.2783203125px]" />
      <div data-name="Frame 1" className="flex overflow-hidden py-[35px] px-[10px] flex-col justify-center items-center gap-[10px] w-127 h-256">
        <div data-name="Group 1" className="w-96 h-[266px]">
          <p data-name="Pomidori Clock" className="w-[169px] h-16 text-2xl text-black">
            Pomidori Clock
          </p>
          <div data-name="Frame 1" className="flex flex-col gap-[10px] h-48">
            <div data-name="email" className="flex flex-col gap-[6px] h-[66px]">
              <p data-name="Email" className="w-9 h-5 text-sm font-medium text-slate-900">Email</p>
              <div data-name="input/with button" className="flex gap-2 w-96">
                <div data-name="default" className="flex flex-col gap-[6px] w-96 h-10 grow">
                  <div data-name="field" className="flex py-2 pr-14 pl-3 items-center w-96 bg-white border-t border-r border-b border-l border-slate-300 border-solid rounded-[6px]">
                    <p data-name="Email" className="w-[41px] h-6 text-base text-slate-400">Email</p>
                  </div>
                </div>
              </div>
            </div>
            <div data-name="password" className="flex flex-col gap-[6px] h-[66px]">
              <p data-name="password" className="w-[66px] h-5 text-sm font-medium text-slate-900">Password</p>
              <div data-name="input/with button" className="flex gap-2 w-96">
                <div data-name="default" className="flex flex-col gap-[6px] w-96 h-10 grow">
                  <div data-name="field" className="flex py-2 pr-14 pl-3 items-center w-96 bg-white border-t border-r border-b border-l border-slate-300 border-solid rounded-[6px]">
                    <p data-name="Email" className="w-[74px] h-6 text-base text-slate-400">Password</p>
                  </div>
                </div>
              </div>
            </div>
            <div data-name="Frame 2" className="flex overflow-hidden justify-end gap-[10px] w-96">
              <div data-name="button" className="flex py-2 px-4 justify-center items-center gap-[10px] w-22 bg-white border-t border-r border-b border-l border-slate-200 border-solid rounded-[6px]">
                <p data-name="Cancel" className="w-14 h-6 text-sm font-medium text-slate-900">Register</p>
              </div>
              <div data-name="button" className="flex py-2 px-4 justify-center items-center gap-[10px] w-[93px] bg-slate-900 rounded-[6px]">
                <p data-name="Continue" className="w-[61px] h-6 text-sm font-medium text-white">Continue</p>
              </div>
            </div>
          </div>
        </div>
        <div data-name="button" className="flex py-2 px-4 justify-center items-center gap-[10px] w-[191px] bg-slate-900 rounded-[6px]">
          <div data-name="Vector" className="w-[15px] h-[13.500495910644531px] border-[1.5px] border-white border-solid" />
          <p data-name="Continue" className="w-[134px] h-6 text-sm font-medium text-white">Continue as a guest</p>
        </div>
        <div data-name="button" className="flex py-2 px-4 justify-center items-center gap-[10px] w-[162px] bg-slate-900 rounded-[6px]">
          <div data-name="icon/user" className="overflow-hidden w-5 h-5">
            <div data-name="Vector" className="w-[11.666666666666668px] h-[5px] border-[1.6666666269302368px] border-white border-solid" />
            <div data-name="Vector" className="w-[6.666666666666667px] h-[6.666666666666667px] border-[1.6666666269302368px] border-white border-solid" />
          </div>
          <p data-name="Select account" className="w-25 h-6 text-sm font-medium text-white">Select account</p>
        </div>
      </div>
    </div>
  )
}

export default Login