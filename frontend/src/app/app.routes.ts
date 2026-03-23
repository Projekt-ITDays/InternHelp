import { Routes } from '@angular/router';
import { WelcomeScreen } from './pages/welcome-screen/welcome-screen';
import { PromptComponent } from './prompt-component/prompt-component';
import { Dashboard } from './pages/dashboard/dashboard';
import { Settings } from './pages/settings/settings';

export const routes: Routes = [
	{
		path: '',
		component: WelcomeScreen,
		pathMatch: 'full',
	},

	{
		path : 'aiapi',
		component : PromptComponent
	},
	{
		path: 'dashboard',
		component: Dashboard
	},
	{
		path: 'Settings',
		component : Settings
	},
	{
		path: '**',
		redirectTo: '',
	}
];
