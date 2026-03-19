import { Routes } from '@angular/router';
import { WelcomeScreen } from './pages/welcome-screen/welcome-screen';
import { PromptComponent } from './prompt-component/prompt-component';

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
		path: '**',
		redirectTo: '',
	}
];
