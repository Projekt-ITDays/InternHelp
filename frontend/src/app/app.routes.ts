import { Routes } from '@angular/router';
import { WelcomeScreen } from './pages/welcome-screen/welcome-screen';
import { PromptComponent } from './prompt-component/prompt-component';
import { Dashboard } from './pages/dashboard/dashboard';
import { RoadmapComponent } from './roadmap-component/roadmap-component';
import { Settings } from './pages/settings/settings';
import { authGuard } from './guards/auth.guard';
import { Survey } from './survey/survey';

export const routes: Routes = [
	{
		path: '',
		component: WelcomeScreen,
		pathMatch: 'full',
	},
	{	
		path: 'survey',
		component : Survey,


	},
	{
		// Zmiana aiapi -> ai/ask
		path : 'ai/ask',
		component : PromptComponent,
		canActivate : [authGuard]

	},
	{
		path: 'ai/roadmap/:careerPath',
		component: RoadmapComponent,
		canActivate : [authGuard]
	},
	{
		path: 'dashboard',
		component: Dashboard,
		canActivate : [authGuard]
	},
	{
		path: 'Settings',
		component : Settings,
		canActivate : [authGuard]
	},
	{
		path: '**',
		redirectTo: '',
	}
];
