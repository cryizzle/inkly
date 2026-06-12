<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'Desk' },
		{ href: '/rewards', label: 'Rewards' },
		{ href: '/writing', label: 'Writing' },
		{ href: '/reading', label: 'Reading' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>ink.ly</title>
</svelte:head>

<div class="app-shell">
	<div class="paper" style="padding: 1.2rem; overflow: hidden;">
		<header
			style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.8rem 1rem 1.3rem; border-bottom: 1px solid rgba(97, 70, 35, 0.1); flex-wrap: wrap;"
		>
			<div>
				<div class="eyebrow">A Writer's Desk</div>
				<a class="display" href="/" style="font-size: clamp(2rem, 4vw, 3.4rem);">ink.ly</a>
			</div>
			<nav
				style="display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; justify-content: flex-end;"
			>
				{#each links as link}
					<a class="button subtle" href={link.href}>{link.label}</a>
				{/each}
			</nav>
		</header>
		<div style="padding: 1.4rem 1rem 1rem;">
			{@render children()}
		</div>
	</div>
</div>
