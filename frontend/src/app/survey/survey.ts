import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-survey',
  imports: [FormsModule , MatFormField ,  MatInputModule ,MatAutocompleteModule,ReactiveFormsModule ],
  templateUrl: './survey.html',
  styleUrl: './survey.css',
})
export class Survey {
    timeRangestoChoose = ['3 months', '6 months', '9 months', '1 year', '2 years'];
}
