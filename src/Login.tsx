import { IconUser } from '@tabler/icons-react'
import loginImage from './assets/img/pomofocus_login_img.png'

type Props = {}

const Login = (props: Props) => {
  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[62%_38%]">
      <aside className="hidden lg:block relative h-screen overflow-hidden">
        <img
          src={loginImage}
          alt="Pomidori Clock login visual"
          className="h-full w-full object-cover"
        />
      </aside>

      <section className="relative flex min-h-screen items-center justify-center bg-white px-6 py-10 lg:px-12 lg:py-0">
        <div className="relative w-full max-w-md">
          <div className="space-y-8 py-10 text-center sm:py-16">
            <h1 className="text-3xl font-medium tracking-tight text-slate-950">Pomidori Clock</h1>
            <p className="mx-auto max-w-sm text-sm text-slate-500">
              Sign in to access your productivity timer, or register a new account to begin tracking sessions.
            </p>
          </div>

          <form className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm shadow-slate-200/60">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-600">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-600">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/10"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Register
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Continue
              </button>
            </div>
          </form>

          <button
            type="button"
            className="absolute bottom-8 right-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800 sm:bottom-10 sm:right-10"
          >
            <IconUser size={18} />
            Continue as a guest
          </button>
        </div>
      </section>
    </main>
  )
}

export default Login