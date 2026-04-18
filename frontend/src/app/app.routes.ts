import { Routes } from '@angular/router';
import { WelcomeScreen } from './pages/welcome-screen/welcome-screen';
import { PromptComponent } from './pages/prompt/prompt-component';
import { Dashboard } from './pages/dashboard/dashboard';
import { RoadmapComponent } from './pages/roadmap/roadmap-component';
import { Settings } from './pages/settings/settings';
import { authGuard } from './core/guards/auth.guard';
import { Survey } from './pages/survey/survey';

export const routes: Routes = [
	{
		path: '',
		component: WelcomeScreen,
		pathMatch: 'full',
	},
	{
		path: 'survey',
		component: Survey,
		canActivate: []
	},
	{
		// Zmiana aiapi -> ai/ask
		path: 'ai/ask',
		component: PromptComponent,
		canActivate: []

	},
	{
		path: 'ai/roadmap/:careerPath',
		component: RoadmapComponent,
		canActivate: []
	},
	{
		path: 'dashboard',
		component: Dashboard,
		canActivate: []
	},
	{
		path: '**',
		redirectTo: '',
	}
];
