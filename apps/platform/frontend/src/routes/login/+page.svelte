<script lang="ts">
	import { enhance } from '$app/forms';

	let isLoading = $state(false);
</script>

<svelte:head>
	<title>EasyPath - Login</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8"
	style="
		background-color: var(--color-secondary-100);
		color: var(--color-text-500);
	"
>
	<div
		class="w-full max-w-md space-y-8 rounded-xl p-10 shadow-lg"
		style="background-color: var(--color-background-100);"
	>
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold" style="color: var(--color-primary-500);">
				Entre com a sua conta
			</h2>
		</div>

		<form
			class="mt-8 space-y-6"
			method="POST"
			use:enhance={() => {
				isLoading = true;
				return async ({ update }) => {
					await update();
					isLoading = false;
				};
			}}
		>
			<input type="hidden" name="remember" value="true" />

			<div class="-space-y-px rounded-md shadow-sm">
				<div>
					<label for="email-address" class="sr-only">Email</label>
					<input
						id="email-address"
						name="email"
						type="text"
						autocomplete="email"
						required
						class="relative block w-full appearance-none rounded-none rounded-t-md border px-3 py-3 placeholder-gray-400 focus:z-10 focus:outline-none sm:text-sm"
						style="
							color: var(--color-text-500); /* Input text */
							border-color: var(--color-secondary-300); /* Input border */
							background-color: var(--color-secondary-50); /* Input background */
							--tw-ring-color: var(--color-primary-500); /* Focus ring */
							/* --tw-border-color: var(--color-primary-500); Tailwind handles focus border via ring by default if focus:border-primary-500 class is used or similar */
						"
						placeholder="Email"
					/>
				</div>
				<div>
					<label for="password" class="sr-only">Senha</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						class="relative block w-full appearance-none rounded-none rounded-b-md border px-3 py-3 placeholder-gray-400 focus:z-10 focus:outline-none sm:text-sm"
						style="
							color: var(--color-text-500); /* Input text */
							border-color: var(--color-secondary-300); /* Input border */
							background-color: var(--color-secondary-50); /* Input background */
							--tw-ring-color: var(--color-primary-500); /* Focus ring */
						"
						placeholder="Senha"
					/>
				</div>
			</div>

			<div class="flex items-center justify-between">
				<div class="flex items-center">
					<input
						id="remember-me"
						name="remember-me"
						type="checkbox"
						class="h-4 w-4 cursor-pointer rounded"
						style="
							background-color: var(--color-secondary-100); /* Checkbox background */
							border-color: var(--color-secondary-400); /* Checkbox border */
							color: var(--color-primary-500); /* Checkbox checkmark color */
						"
					/>
					<label
						for="remember-me"
						class="ml-2 block cursor-pointer text-sm"
						style="color: var(--color-text-700);"
					>
						Lembre-se de mim
					</label>
				</div>

				<div class="text-sm">
					<a
						href="/forgot-password"
						class="font-medium hover:brightness-110"
						style="color: var(--color-accent-500);"
					>
						Esqueceu sua senha?
					</a>
				</div>
			</div>

			<div>
				<button
					type="submit"
					class="group relative flex w-full justify-center rounded-md border border-transparent px-4 py-3 text-sm font-medium text-white hover:brightness-110 focus:ring-2 focus:outline-none"
					style="
						background-color: var(--color-primary-500); /* Button background - primary */
						color: var(--color-background-100); /* Button text - assuming light text on primary color */
						--tw-ring-color: var(--color-primary-500); /* Focus ring */
						--tw-ring-offset-color: var(--color-secondary-200); /* Focus ring offset */
					"
					aria-busy={isLoading}
					disabled={isLoading}
				>
					<svg
						class:hidden={!isLoading}
						class="mr-3 -ml-1 hidden h-5 w-5 animate-spin"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span>{isLoading ? 'Entrando...' : 'Entrar'}</span>
				</button>
			</div>
		</form>

		<p class="mt-4 text-center text-sm" style="color: var(--color-text-700);">
			Não possui uma conta?
			<a
				href="/signup"
				class="font-medium hover:brightness-110"
				style="color: var(--color-accent-500);"
			>
				Se inscreva
			</a>
		</p>
	</div>
</div>
