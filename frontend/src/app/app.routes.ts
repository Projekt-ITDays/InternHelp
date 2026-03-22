import { Routes } from '@angular/router';
import { WelcomeScreen } from './pages/welcome-screen/welcome-screen';
import { PromptComponent } from './prompt-component/prompt-component';
import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
	{
		path: '',
		component: WelcomeScreen,
		pathMatch: 'full',
	},

	{
		// Zmiana aiapi -> ai/ask
		path : 'ai/ask',
		component : PromptComponent
	},
	{
		path: 'dashboard',
		component: Dashboard
	},
	{
		path: '**',
		redirectTo: '',
	}
];
